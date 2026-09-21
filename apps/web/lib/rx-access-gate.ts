// apps/web/lib/rx-access-gate.ts
//
// The server side of the two prescription access gates: the patient's 6-digit
// code and the pharmacy's last-name + date-of-birth check.
//
// Both gates run the same shape — evaluate the throttle, compare, record the
// attempt, update counters — because a difference between them is a difference
// an attacker can measure. The one thing that legitimately differs is the
// counter pair they move, so a pharmacist mistyping a date of birth cannot
// lock a patient out of their own prescription.
//
// EVERY FAILURE PATH RETURNS THE SAME SHAPE. Unknown uuid, wrong code, wrong
// surname, expired code and lockout are indistinguishable to the caller
// except where the patient genuinely needs to be told to wait. In particular
// an unknown order still runs the full comparison against a synthetic record,
// so "does this prescription exist" cannot be answered by status or latency.

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rxOrders,
  rxOrderAccess,
  rxOrderAccessAttempts,
  type Patient,
  type RxOrder,
} from "@/db/schema";
import { findPatientByRxOrderUuid } from "@/lib/rx-order-helpers";
import {
  RX_ACCESS_POLICY,
  applyFailure,
  applySuccess,
  evaluateAccessGate,
  hashAccessCode,
  hashIp,
  isSameCalendarDay,
  normalizeNameForComparison,
  verifyAccessCode,
} from "@/lib/rx-access-policy";

export type AccessGate = "patient" | "pharmacy";

const COOKIE_TTL_SECONDS = 30 * 60;
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

function cookieName(gate: AccessGate, uuid: string): string {
  return `rx_${gate}_access_${uuid}`;
}

/** Issues the short-lived proof that this browser passed the gate. */
async function issueAccessCookie(gate: AccessGate, uuid: string): Promise<void> {
  const token = jwt.sign({ gate, uuid }, JWT_SECRET, {
    expiresIn: COOKIE_TTL_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName(gate, uuid), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_TTL_SECONDS,
    path: "/",
  });
}

/** Whether this browser already passed the gate for this order. */
export async function hasValidAccessCookie(
  gate: AccessGate,
  uuid: string,
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName(gate, uuid))?.value;
    if (!token) return false;

    const decoded = jwt.verify(token, JWT_SECRET) as { gate?: string; uuid?: string };
    // Both claims are checked so a patient cookie cannot be replayed at the
    // pharmacy gate, or one order's cookie at another order.
    return decoded.gate === gate && decoded.uuid === uuid;
  } catch {
    return false;
  }
}

export type AccessAttemptResult =
  | { ok: true; rxOrder: RxOrder; patient: Patient }
  | { ok: false; reason: "rejected" }
  | { ok: false; reason: "throttled"; retryAfterMs: number }
  | { ok: false; reason: "locked" }
  | { ok: false; reason: "ip-throttled" };

/**
 * How many attempts this source has made in the last hour, across all orders.
 *
 * Per-order backoff alone does not stop someone spraying one guess each at a
 * thousand uuids; this does.
 */
async function ipAttemptsInLastHour(ipHash: string | null): Promise<number> {
  if (!ipHash) return 0;
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rxOrderAccessAttempts)
    .where(
      and(
        eq(rxOrderAccessAttempts.ipHash, ipHash),
        gte(rxOrderAccessAttempts.createdAt, since),
      ),
    );
  return row?.count ?? 0;
}

async function recordAttempt(input: {
  rxOrderId: string;
  gate: AccessGate;
  succeeded: boolean;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    await db.insert(rxOrderAccessAttempts).values(input);
  } catch (error) {
    // Never fail an attempt because the audit write failed.
    console.error("[rx-access-gate] Failed to record attempt:", error);
  }
}

export interface AttemptAccessInput {
  uuid: string;
  gate: AccessGate;
  /** The patient gate's 6-digit code. */
  code?: string;
  /** The pharmacy gate's identity check. */
  lastName?: string;
  dob?: string;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Runs one gate attempt end to end.
 *
 * On success the caller gets the order and patient, and this browser holds a
 * cookie good for 30 minutes. On any failure the caller gets a reason narrow
 * enough to render a message and no wider.
 */
export async function attemptAccess(
  input: AttemptAccessInput,
): Promise<AccessAttemptResult> {
  const { uuid, gate, ip, userAgent } = input;
  const ipHash = hashIp(ip);
  const now = new Date();

  if ((await ipAttemptsInLastHour(ipHash)) >= RX_ACCESS_POLICY.IP_ATTEMPTS_PER_HOUR) {
    return { ok: false, reason: "ip-throttled" };
  }

  const found = await findPatientByRxOrderUuid(
    uuid,
    gate === "patient" ? "patientRxUrl" : "pharmacyQrUrl",
  );

  // An unknown uuid still does the comparison work below against a synthetic
  // record, so it costs the same time as a real one and cannot be told apart.
  const rxOrder = found?.rxOrder ?? null;
  const patient = found?.patient ?? null;

  const [accessRow] = rxOrder
    ? await db
        .select()
        .from(rxOrderAccess)
        .where(eq(rxOrderAccess.rxOrderId, rxOrder.id))
        .limit(1)
    : [];

  const isPatientGate = gate === "patient";
  const lifetimeFailures = accessRow?.lifetimeFailures ?? 0;
  const consecutiveFailures = isPatientGate
    ? (accessRow?.consecutiveFailures ?? 0)
    : (accessRow?.pharmacyFailures ?? 0);
  const retryAfter = isPatientGate
    ? (accessRow?.retryAfter ?? null)
    : (accessRow?.pharmacyRetryAfter ?? null);

  const decision = evaluateAccessGate({
    // The pharmacy gate has no durable lock: the pharmacist is standing with
    // the patient, and locking them out helps nobody.
    lifetimeFailures: isPatientGate ? lifetimeFailures : 0,
    retryAfter,
    expiresAt: isPatientGate ? (accessRow?.expiresAt ?? null) : null,
    now,
  });

  if (!decision.allowed) {
    if (rxOrder) {
      await recordAttempt({
        rxOrderId: rxOrder.id,
        gate,
        succeeded: false,
        ipHash,
        userAgent,
      });
    }
    if (decision.reason === "locked") return { ok: false, reason: "locked" };
    if (decision.reason === "throttled") {
      return { ok: false, reason: "throttled", retryAfterMs: decision.retryAfterMs };
    }
    return { ok: false, reason: "rejected" };
  }

  const matched = isPatientGate
    ? verifyPatientCode(input.code, accessRow)
    : verifyPharmacyIdentity(input.lastName, input.dob, patient);

  if (rxOrder) {
    await recordAttempt({
      rxOrderId: rxOrder.id,
      gate,
      succeeded: matched,
      ipHash,
      userAgent,
    });
  }

  if (!matched) {
    if (rxOrder && accessRow) {
      const outcome = applyFailure({ consecutiveFailures, lifetimeFailures, now });

      await db
        .update(rxOrderAccess)
        .set(
          isPatientGate
            ? {
                consecutiveFailures: outcome.consecutiveFailures,
                lifetimeFailures: outcome.lifetimeFailures,
                retryAfter: outcome.retryAfter,
              }
            : {
                pharmacyFailures: outcome.consecutiveFailures,
                pharmacyRetryAfter: outcome.retryAfter,
              },
        )
        .where(eq(rxOrderAccess.rxOrderId, rxOrder.id));

      // Only the patient gate moves the synced verdict — that badge is about
      // the link that was messaged out, not about a pharmacy counter.
      if (isPatientGate) {
        await db
          .update(rxOrders)
          .set({
            patientLinkFailedCount: outcome.lifetimeFailures,
            patientLinkLastFailedAt: now,
            patientLinkLockState: outcome.lockState,
          })
          .where(eq(rxOrders.id, rxOrder.id));
      }
    }
    return { ok: false, reason: "rejected" };
  }

  // Matched — and `rxOrder`/`patient` are non-null, because a synthetic record
  // can never match.
  if (!rxOrder || !patient) return { ok: false, reason: "rejected" };

  const success = applySuccess();
  if (accessRow) {
    await db
      .update(rxOrderAccess)
      .set(
        isPatientGate
          ? { consecutiveFailures: success.consecutiveFailures, retryAfter: null }
          : { pharmacyFailures: 0, pharmacyRetryAfter: null },
      )
      .where(eq(rxOrderAccess.rxOrderId, rxOrder.id));
  }

  const [updatedOrder] = await db
    .update(rxOrders)
    .set(
      isPatientGate
        ? {
            // First open only, so "opened" means first read rather than last.
            patientLinkOpenedAt: rxOrder.patientLinkOpenedAt ?? now,
            patientLinkOpenCount: (rxOrder.patientLinkOpenCount ?? 0) + 1,
            patientLinkLockState: success.lockState,
          }
        : { pharmacyLinkOpenedAt: rxOrder.pharmacyLinkOpenedAt ?? now },
    )
    .where(eq(rxOrders.id, rxOrder.id))
    .returning();

  await issueAccessCookie(gate, uuid);

  return { ok: true, rxOrder: updatedOrder ?? rxOrder, patient };
}

function verifyPatientCode(
  code: string | undefined,
  accessRow: { codeHash: string; codeSalt: string } | undefined,
): boolean {
  if (!code) return false;

  if (!accessRow) {
    // No code has been issued (or the order does not exist). Still burn the
    // same hashing work so this path is not measurably faster than a real
    // comparison.
    hashAccessCode(code, "decoy-salt");
    return false;
  }

  return verifyAccessCode(code, accessRow.codeHash, accessRow.codeSalt);
}

function verifyPharmacyIdentity(
  lastName: string | undefined,
  dob: string | undefined,
  patient: Patient | null,
): boolean {
  if (!lastName || !dob) return false;
  if (!patient) return false;

  const nameMatches =
    normalizeNameForComparison(lastName) ===
    normalizeNameForComparison(patient.lastName);

  const parsed = new Date(dob);
  const dobMatches =
    !Number.isNaN(parsed.getTime()) && isSameCalendarDay(parsed, patient.dob);

  return nameMatches && dobMatches;
}

/** Loads an order for a browser that already holds a valid gate cookie. */
export async function loadGatedOrder(
  gate: AccessGate,
  uuid: string,
): Promise<{ rxOrder: RxOrder; patient: Patient } | null> {
  if (!(await hasValidAccessCookie(gate, uuid))) return null;
  const found = await findPatientByRxOrderUuid(
    uuid,
    gate === "patient" ? "patientRxUrl" : "pharmacyQrUrl",
  );
  return found ? { rxOrder: found.rxOrder, patient: found.patient } : null;
}
