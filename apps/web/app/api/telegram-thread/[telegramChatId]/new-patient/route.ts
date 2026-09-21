// apps/web/app/api/telegram-thread/[telegramChatId]/new-patient/route.ts

import { NextResponse } from "next/server";
import {
  getPatientByTelegramChatId,
  createPatient,
  generateIntakeToken,
} from "@/lib/telegram-db-helpers";
import { getRegistrationLinkMessage } from "@/utils/telegram/registrationLinkMessage";
import TelegramBot from "node-telegram-bot-api";
import { createNotificationForAccountType } from "@/utils/notifications/createNotificationForUsers";

/**
 * POST /api/telegram-thread/[telegramChatId]/new-patient
 *
 * Creates a new patient or retrieves existing patient, generates intake token,
 * and sends registration URL via Telegram.
 *
 * @param telegramChatId - Telegram chat ID (from URL path)
 * @body { language?: string } - Optional language preference (default: "en")
 * @returns Patient data, registration URL, and success message
 *
 * @example
 * curl -X POST "http://localhost:3000/api/telegram-thread/123456789/new-patient" \
 *   -H "Content-Type: application/json" \
 *   -d '{"language":"en"}'
 *
 * Response:
 * {
 *   "message": "Patient created successfully",
 *   "registrationUrl": "https://example.com/telegram-patient/abc123...",
 *   "patient": { ... }
 * }
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  const params = await props.params;
  const { telegramChatId } = params;

  console.log("[new-patient] Request for chat ID:", telegramChatId);

  try {
    // Parse request body
    const body = await request.json();
    const { language } = body;
    const languageValue = language || "en";

    console.log("[new-patient] Language:", languageValue);

    // Check if the patient already exists
    let patient = await getPatientByTelegramChatId(telegramChatId);
    let isNewPatient = false;

    if (!patient) {
      isNewPatient = true;
      console.log("[new-patient] Creating new patient");

      // Create new patient
      patient = await createPatient({
        telegramChatId,
        language: languageValue,
        hasSubmittedInfo: false,
      });

      console.log(`[new-patient] New patient created with ID: ${patient.id}`);

      // Create notification for all Triage users about the new patient
      try {
        await createNotificationForAccountType({
          message: `New patient registered via Telegram (ID: ${patient.id})`,
          accountType: "Triage",
          patientId: patient.id,
          type: "alert",
          redirectTo: "/patient-dashboard",
        });
        console.log("[new-patient] Triage notification created");
      } catch (notificationError) {
        // Log but don't fail the request
        console.error(
          "[new-patient] Error creating triage notification:",
          notificationError,
        );
      }
    } else {
      console.log(
        `[new-patient] Existing patient found with ID: ${patient.id}`,
      );
    }

    // Generate a secure token for this patient
    console.log("[new-patient] Generating intake token");
    const token = await generateIntakeToken(patient.id, telegramChatId);

    // Generate registration URL with the token
    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new Error("NEXTAUTH_URL is not defined in environment variables.");
    }
    const registrationUrl = `${baseUrl}/telegram-patient/${token}`;

    console.log(
      "[new-patient] Registration URL generated:",
      registrationUrl.substring(0, 50) + "...",
    );

    // Validate bot token and send registration messages
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error(
        "Telegram bot token is not defined in environment variables.",
      );
    }

    console.log("[new-patient] Sending Telegram messages");
    const bot = new TelegramBot(botToken);

    // Get registration message in the user's language
    const registrationMessage = getRegistrationLinkMessage(languageValue);

    // Send messages to the user
    await bot.sendMessage(telegramChatId, registrationMessage);
    await bot.sendMessage(telegramChatId, registrationUrl);

    console.log("[new-patient] Telegram messages sent successfully");

    return NextResponse.json({
      message: isNewPatient
        ? "Patient created successfully"
        : "Existing patient found",
      registrationUrl,
      patient,
    });
  } catch (error) {
    console.error("[new-patient] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
