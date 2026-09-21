// apps/web/app/api/telegram-thread/[telegramChatId]/get-intake-url/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/telegram/validateApiKey";
import {
  getPatientByTelegramChatId,
  findExistingValidToken,
  generateIntakeToken,
} from "@/lib/telegram-db-helpers";

/**
 * GET /api/telegram-thread/[telegramChatId]/get-intake-url
 *
 * Generates or retrieves an intake form URL for a patient.
 * Requires API key authentication (for bot/webhook use).
 *
 * @param telegramChatId - Telegram chat ID (from URL path)
 * @returns Patient ID and intake token
 *
 * @example
 * curl -H "Authorization: Bearer YOUR_API_KEY" \
 *   "http://localhost:3000/api/telegram-thread/123456789/get-intake-url"
 *
 * Response:
 * {
 *   "patientId": "uuid-here",
 *   "token": "abc123..."
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ telegramChatId: string }> },
) {
  // Validate API key
  const authHeader = request.headers.get("authorization");
  if (!validateApiKey(authHeader)) {
    console.warn("[get-intake-url] Unauthorized - Invalid API key");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { telegramChatId } = await context.params;

  console.log("[get-intake-url] Request for chat ID:", telegramChatId);

  if (!telegramChatId) {
    return NextResponse.json({ error: "Missing chat ID" }, { status: 400 });
  }

  try {
    // Find patient by Telegram chat ID
    const patient = await getPatientByTelegramChatId(telegramChatId);

    if (!patient || !patient.id) {
      console.warn(
        "[get-intake-url] Patient not found for chat ID:",
        telegramChatId,
      );
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    console.log("[get-intake-url] Found patient ID:", patient.id);

    // Check for existing valid token
    const existingToken = await findExistingValidToken(
      patient.id,
      telegramChatId,
    );

    let token: string;

    if (existingToken) {
      console.log("[get-intake-url] Using existing valid token");
      token = existingToken.token;
    } else {
      console.log("[get-intake-url] Generating new token");
      // Generate a new token with the default "never expire" setting (100 years)
      token = await generateIntakeToken(patient.id, telegramChatId);
    }

    console.log(
      "[get-intake-url] Success - Token:",
      token.substring(0, 8) + "...",
    );

    return NextResponse.json({
      patientId: patient.id,
      token,
    });
  } catch (error) {
    console.error("[get-intake-url] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
