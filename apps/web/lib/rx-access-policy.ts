// apps/web/lib/rx-access-policy.ts
//
// The throttle in front of the prescription access code.
//
// A 6-digit code is 10^6 combinations. Unthrottled at 10 requests/second that
// falls in about a day, so the throttle *is* the security — the code length is
// chosen for a patient reading it off a phone, not for entropy.
//
// The shape matters as much as the numbers. A flat "N tries then blocked"
// hands anyone holding the link a denial-of-service against the patient's own
// prescription. Exponential backoff instead drops an attacker to a handful of
// guesses per hour, while a patient who mistypes twice waits seconds. The
// durable lock only arrives after a lifetime cap, and clearing it goes through
// a human on the clinic side who re-sends — which rotates the code. That is
// the same escalate-to-another-channel shape NIST SP 800-63B describes for
// throttled memorized secrets.
//
// All counters live in `rx_order_access` rather than a module-level Map. The
// two in-memory limiters already in this codebase (auth-db-helpers.ts,
// telegram-thread/link-patient/route.ts) reset on every deploy and do not hold
// across replicas, which makes them decoration rather than defence.

import { createHash, randomInt, timingSafeEqual, randomBytes } from "crypto";

/**
 * Consecutive-failure → cooldown. The first entries are free so a fat-fingered
 * digit is not a punishment; the tail is long enough that grinding is hopeless.
 *
 * Index is the failure count, so index 0..2 are unreachable (checked after the
 * increment) and exist to keep the mapping readable.
 */
const BACKOFF_LADDER_MS: readonly number[] = [
  0, // 0 failures
  0, // 1
  0, // 2
  0, // 3 — still free
  30_000, // 4  → 30 seconds
  120_000, // 5  → 2 minutes
  600_000, // 6  → 10 minutes
  3_600_000, // 7+ → 1 hour
];

export const RX_ACCESS_POLICY = {
  CODE_DIGITS: 6,
  /** Consecutive failures past this point all draw the final cooldown. */
  MAX_LADDER_INDEX: BACKOFF_LADDER_MS.length - 1,
  /** Lifetime failures before the link locks and needs a staff re-send. */
  LIFETIME_FAILURE_CAP: 20,
  /** Per-IP ceiling across *all* orders, to stop uuid spraying. */
  IP_ATTEMPTS_PER_HOUR: 20,
  /** Fallback lifetime when the order carries no `validTill`. */
  DEFAULT_CODE_TTL_MS: 90 * 24 * 60 * 60 * 1000,
} as const;

export function backoffForFailureCount(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  const index = Math.min(consecutiveFailures, RX_ACCESS_POLICY.MAX_LADDER_INDEX);
  return BACKOFF_LADDER_MS[index];
}

/**
 * A 6-digit code from a CSPRNG.
 *
 * `randomInt` rather than `Math.random()`: this is the only secret protecting
 * the record, and a predictable PRNG would make the throttle above pointless.
 * Leading zeros are preserved — "004821" is a valid code and must not become
 * "4821", or a sixth of the keyspace silently disappears.
 */
export function generateAccessCode(): string {
  const max = 10 ** RX_ACCESS_POLICY.CODE_DIGITS;
  return String(randomInt(0, max)).padStart(RX_ACCESS_POLICY.CODE_DIGITS, "0");
}

export function generateCodeSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashAccessCode(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}${code}`).digest("hex");
}

/**
 * Constant-time comparison of the stored hash against a candidate code.
 *
 * A `===` here leaks the length of the matching prefix through timing. The
 * hashes are fixed-length hex, so the buffers always match in size and
 * `timingSafeEqual` cannot throw on this path.
 */
export function verifyAccessCode(
  candidate: string,
  codeHash: string,
  codeSalt: string,
): boolean {
  const candidateHash = hashAccessCode(candidate, codeSalt);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(codeHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Hash of the client IP, for the attempt log and the per-IP limiter.
 *
 * Salted with a server secret so the log cannot be reversed into a visitor
 * list: it exists to judge whether a burst of failures was one confused
 * patient or a scan, and that question only needs "same source or not".
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

/** Best-effort client IP behind the reverse proxy. */
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}

export type AccessGateDecision =
  | { allowed: true }
  | { allowed: false; reason: "locked" }
  | { allowed: false; reason: "throttled"; retryAfterMs: number }
  | { allowed: false; reason: "expired" };

/**
 * Whether an attempt may proceed, before the code is even compared.
 *
 * Deliberately evaluated for orders that do not exist too — the caller feeds it
 * a synthetic record so an unknown uuid takes the same path, and cannot be
 * distinguished from a wrong code by status or latency.
 */
export function evaluateAccessGate(input: {
  lifetimeFailures: number;
  retryAfter: Date | null;
  expiresAt: Date | null;
  now: Date;
}): AccessGateDecision {
  const { lifetimeFailures, retryAfter, expiresAt, now } = input;

  if (lifetimeFailures >= RX_ACCESS_POLICY.LIFETIME_FAILURE_CAP) {
    return { allowed: false, reason: "locked" };
  }
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "expired" };
  }
  if (retryAfter && retryAfter.getTime() > now.getTime()) {
    return {
      allowed: false,
      reason: "throttled",
      retryAfterMs: retryAfter.getTime() - now.getTime(),
    };
  }
  return { allowed: true };
}

export interface FailureOutcome {
  consecutiveFailures: number;
  lifetimeFailures: number;
  retryAfter: Date | null;
  /** What the synced `rx_orders.patient_link_lock_state` should become. */
  lockState: "ok" | "throttled" | "locked";
}

/** Counters and verdict after one failed attempt. */
export function applyFailure(input: {
  consecutiveFailures: number;
  lifetimeFailures: number;
  now: Date;
}): FailureOutcome {
  const consecutiveFailures = input.consecutiveFailures + 1;
  const lifetimeFailures = input.lifetimeFailures + 1;
  const backoff = backoffForFailureCount(consecutiveFailures);

  const locked = lifetimeFailures >= RX_ACCESS_POLICY.LIFETIME_FAILURE_CAP;

  return {
    consecutiveFailures,
    lifetimeFailures,
    retryAfter: backoff > 0 ? new Date(input.now.getTime() + backoff) : null,
    lockState: locked ? "locked" : backoff > 0 ? "throttled" : "ok",
  };
}

/**
 * Counters after a successful attempt.
 *
 * `lifetimeFailures` is intentionally NOT reset: it is the audit signal behind
 * the suspicious-activity badge, and a successful guess at the end of a long
 * grind is precisely the case staff need to see.
 */
export function applySuccess(): {
  consecutiveFailures: number;
  retryAfter: null;
  lockState: "ok";
} {
  return { consecutiveFailures: 0, retryAfter: null, lockState: "ok" };
}

/** When a freshly issued code should stop working. */
export function codeExpiryFor(validTill: Date | null | undefined, now: Date): Date {
  if (validTill && validTill.getTime() > now.getTime()) return validTill;
  return new Date(now.getTime() + RX_ACCESS_POLICY.DEFAULT_CODE_TTL_MS);
}

/** Case- and whitespace-insensitive surname match for the pharmacy gate. */
export function normalizeNameForComparison(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Compares two dates by calendar day, ignoring time and zone drift. */
export function isSameCalendarDay(
  a: Date | null | undefined,
  b: Date | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
