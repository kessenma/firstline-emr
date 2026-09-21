// app/api/patient/[id]/medications/rx-order/[rxOrderId]/send-to-patient/route.ts
//
// Pushes a prescription link into the patient's messaging thread and records
// that it went out.
//
// One route rather than "client sends, then client marks sent": two calls can
// fail between each other, leaving the button and the record disagreeing about
// whether the patient has the script. Both web and mobile call this same
// endpoint with the same body, so the two clients cannot drift either.

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, rxOrders, rxOrderAccess } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { resolveSenderIdentity } from "@/lib/telegram-sender-identity";
import {
  sendTelegramText,
  TelegramNotConfiguredError,
} from "@/lib/telegram-send";
import { getTelegramThreadByChatId } from "@/lib/telegram-db-helpers";
import {
  buildPrescriptionTelegramPayload,
  isPrescriptionCancelled,
} from "@fajr/shared/medications";
import {
  generateAccessCode,
  generateCodeSalt,
  hashAccessCode,
  codeExpiryFor,
} from "@/lib/rx-access-policy";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; rxOrderId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId, rxOrderId } = await props.params;

    const [rxOrder] = await db
      .select()
      .from(rxOrders)
      .where(eq(rxOrders.id, rxOrderId))
      .limit(1);

    // Checked together: an order that exists but belongs to another patient
    // must not be sendable by way of a mismatched URL.
    if (!rxOrder || rxOrder.patientId !== patientId) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // A withdrawn script must never go back out. The patient has already been
    // told it is dead, and its QR was cleared on cancellation.
    if (isPrescriptionCancelled(rxOrder)) {
      return NextResponse.json(
        {
          error: "This prescription has been cancelled and cannot be sent.",
          reason: "cancelled",
        },
        { status: 422 },
      );
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const telegramChatId = patient.telegramChatId?.trim();
    if (!telegramChatId) {
      // Distinct from the 404 below: this patient has no messaging address at
      // all, which is a different thing for the UI to say than "the thread is
      // missing".
      return NextResponse.json(
        {
          error: "This patient has no Telegram chat",
          reason: "no-channel",
        },
        { status: 409 },
      );
    }

    const thread = await getTelegramThreadByChatId(telegramChatId);
    if (!thread) {
      return NextResponse.json(
        {
          error: "No Telegram thread exists for this patient yet",
          reason: "no-thread",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    // Issued on first send; a re-send rotates it, so a link that has been
    // ground against by an attacker gets a fresh secret rather than an
    // unlocked old one. The plaintext exists here and in the patient's chat,
    // nowhere else, and is never logged.
    const accessCode = generateAccessCode();
    const codeSalt = generateCodeSalt();
    const expiresAt = codeExpiryFor(rxOrder.validTill, now);

    const built = buildPrescriptionTelegramPayload({
      rxOrder,
      language: patient.language,
      accessCode,
    });

    if (!built.ok) {
      // 422 rather than 500: the order is intact, its link is not. Sending
      // anyway is how patients used to receive the word "undefined".
      return NextResponse.json(
        {
          error:
            "This prescription has no patient link. Re-create the prescription, then share it again.",
          reason: built.reason,
        },
        { status: 422 },
      );
    }

    const { senderName, senderId } = await resolveSenderIdentity(session);

    // Send before writing anything: a stamp without a delivered message is a
    // worse lie than a delivered message without a stamp.
    await sendTelegramText({
      chatId: telegramChatId,
      text: built.payload.text,
      senderName,
      senderId,
      signatureMode: built.payload.signatureMode,
      followUps: built.payload.followUps,
    });

    await db
      .insert(rxOrderAccess)
      .values({
        rxOrderId: rxOrder.id,
        codeHash: hashAccessCode(accessCode, codeSalt),
        codeSalt,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: rxOrderAccess.rxOrderId,
        set: {
          codeHash: hashAccessCode(accessCode, codeSalt),
          codeSalt,
          expiresAt,
          rotatedAt: now,
          // A re-send is the sanctioned way out of a lockout, so the counters
          // reset with the new code. Lifetime failures are kept on the order
          // row for the audit trail.
          consecutiveFailures: 0,
          lifetimeFailures: 0,
          retryAfter: null,
        },
      });

    const [updated] = await db
      .update(rxOrders)
      .set({
        patientLinkSentAt: now,
        patientLinkSentBy: senderId,
        patientLinkLockState: "ok",
        updatedAt: now,
      })
      .where(eq(rxOrders.id, rxOrder.id))
      .returning();

    return NextResponse.json({
      success: true,
      // Returned so the client can patch its state without a refetch. The
      // access code is deliberately absent: it is the patient's, and an
      // clinician's screen is not where it belongs.
      rxOrder: updated,
    });
  } catch (error) {
    if (error instanceof TelegramNotConfiguredError) {
      return NextResponse.json(
        { error: "Telegram bot token is not configured" },
        { status: 500 },
      );
    }

    console.error("[POST send-to-patient] Error:", error);
    return NextResponse.json(
      { error: "Failed to send prescription" },
      { status: 500 },
    );
  }
}
