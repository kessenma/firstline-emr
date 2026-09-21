// app/api/telegram-thread/link-patient/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  redeemLinkCode,
  createPendingLinkAttempt,
} from "@/lib/telegram-db-helpers";
import { createNotificationForUser } from "@/utils/notifications";
import { getLinkCodeMessages } from "@/utils/telegram/linkCodeMessages";

// Rate limiting: track attempts per chatId
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(chatId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(chatId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(chatId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/**
 * POST /api/telegram-thread/link-patient
 *
 * Called by the Go bot when a patient sends a link code.
 * Links an existing patient record to their Telegram chat ID.
 *
 * Auth: MEDFLOW_KEY (bearer token from Go bot)
 *
 * Body: { code: string, telegramChatId: string }
 *
 * Responses:
 * - 200 { success: true, patientId, patientName, skipIntake } — linked successfully
 * - 200 { success: false, pending: true } — code not registered yet (doctor offline)
 * - 200 { success: false, error: "already_linked" } — chatId already linked to another patient
 * - 400 — invalid request
 * - 401 — unauthorized
 * - 429 — rate limited
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: MEDFLOW_KEY or session/JWT
    const session = await verifySessionFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const hasBearerToken = authHeader?.startsWith("Bearer ");

    let isSystemAuth = false;
    if (hasBearerToken && !session) {
      const token = authHeader!.substring(7);
      if (token !== process.env.MEDFLOW_KEY) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      isSystemAuth = true;
    }

    if (!session && !isSystemAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, telegramChatId } = body;

    if (!code || !telegramChatId) {
      return NextResponse.json(
        { error: "Missing required fields: code, telegramChatId" },
        { status: 400 },
      );
    }

    // Validate code format (6 chars from any supported alphabet)
    const codeTrimmed = code.toUpperCase().trim();
    if (!/^[A-Z2-9بتجدرسعفكلمنه٢٣٤٥٦٧٨٩]{6}$/u.test(codeTrimmed)) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 },
      );
    }

    // Rate limiting
    if (isRateLimited(telegramChatId)) {
      const rateMsgs = getLinkCodeMessages(null);
      return NextResponse.json(
        { error: "rate_limited", botMessage: rateMsgs.linkRateLimited },
        { status: 429 },
      );
    }

    // Try to redeem the code
    const result = await redeemLinkCode(codeTrimmed, telegramChatId);

    if (result) {
      // Successfully linked — notify the code creator
      if (result.createdById) {
        try {
          await createNotificationForUser({
            userId: result.createdById,
            message: `Patient ${result.patientName} has linked their Telegram account`,
            type: "message",
            patientId: result.patientId,
            redirectTo: `/patient/${result.patientId}`,
          });
        } catch (notifError) {
          // Don't fail the link if notification fails
          console.error(
            "[link-patient] Failed to send notification:",
            notifError,
          );
        }
      }

      // Get localized success message
      const msgs = getLinkCodeMessages(result.patientLanguage);

      return NextResponse.json({
        success: true,
        patientId: result.patientId,
        patientName: result.patientName,
        skipIntake: result.skipIntake,
        botMessage: msgs.linkSuccess(result.patientName),
      });
    }

    // Code not found — could be that doctor hasn't synced yet
    // Store as pending attempt
    await createPendingLinkAttempt(codeTrimmed, telegramChatId);

    // Default to English for pending (we don't know the patient's language yet)
    const pendingMsgs = getLinkCodeMessages(null);
    return NextResponse.json({
      success: false,
      pending: true,
      botMessage: pendingMsgs.linkPending,
    });
  } catch (error: any) {
    console.error("[link-patient] Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to process link request" },
      { status: 500 },
    );
  }
}
