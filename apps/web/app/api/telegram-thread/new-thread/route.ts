// apps/web/app/api/telegram-thread/new-thread/route.ts

import { NextResponse } from "next/server";
import { validateApiKey } from "@/utils/telegram/validateApiKey";
import {
  getTelegramThreadByChatId,
  createTelegramThread,
  updateTelegramThread,
  getPatientByTelegramChatId,
  createPatient,
  generateIntakeToken,
} from "@/lib/telegram-db-helpers";
import { db } from "@/db";
import { patientIntakes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Languages } from "@/data/languages.enum";
import TelegramBot from "node-telegram-bot-api";

/**
 * POST /api/telegram-thread/new-thread
 *
 * Creates a new Telegram thread and associated patient if they don't exist.
 * Sends intake form link to the patient via Telegram bot.
 *
 * @body { telegramChatId: string, language?: string }
 * @returns Thread object with creation status
 *
 * @example
 * curl -X POST http://localhost:3000/api/telegram-thread/new-thread \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"telegramChatId":"123456789","language":"en"}'
 *
 * Response:
 * {
 *   "message": "Telegram thread and patient created successfully",
 *   "thread": { ... }
 * }
 */
export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!validateApiKey(authHeader)) {
      console.warn("[new-thread] Unauthorized - Invalid API key");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { telegramChatId, language } = body;

    console.log("[new-thread] Request for chat ID:", telegramChatId);

    if (!telegramChatId) {
      console.error("[new-thread] Missing telegram chat ID");
      return NextResponse.json(
        { error: "Telegram Chat ID is required" },
        { status: 400 },
      );
    }

    // Default to English if language is not provided or invalid
    const supportedLanguages = Object.values(Languages);
    const languageValue = supportedLanguages.includes(language)
      ? language
      : Languages.ENGLISH;

    console.log("[new-thread] Language:", languageValue);

    // Check if the Telegram thread already exists
    let thread = await getTelegramThreadByChatId(telegramChatId);

    if (!thread) {
      console.log("[new-thread] Thread not found - Creating new thread");

      // Automatically create a new patient if one does not exist
      let patient = await getPatientByTelegramChatId(telegramChatId);

      if (!patient) {
        console.log("[new-thread] Patient not found - Creating new patient");

        patient = await createPatient({
          telegramChatId,
          language: languageValue,
          hasSubmittedInfo: false,
        });

        console.log("[new-thread] Patient created with ID:", patient.id);
      } else {
        console.log("[new-thread] Patient already exists:", patient.id);
      }

      // Create new thread
      thread = await createTelegramThread({
        chatId: telegramChatId,
        patientId: patient.id,
        messages: [],
        status: "active",
        unreadCount: 0,
      });

      console.log("[new-thread] Thread created with ID:", thread.id);

      // Send intake form link if patient hasn't submitted info
      if (!patient.hasSubmittedInfo) {
        console.log(
          "[new-thread] Patient has not submitted info - Sending intake form",
        );

        try {
          // Fetch the most recent patient intake settings
          const [patientIntakeSettings] = await db
            .select()
            .from(patientIntakes)
            .orderBy(desc(patientIntakes.createdAt))
            .limit(1);

          const intakeMessage =
            patientIntakeSettings?.intakeMessage ||
            "Welcome! Please complete your registration:";

          const baseUrl = process.env.NEXTAUTH_URL;
          if (!baseUrl) {
            throw new Error(
              "NEXTAUTH_URL is not defined in environment variables.",
            );
          }

          // Generate a secure token for this patient (with default "never expire" setting)
          const token = await generateIntakeToken(patient.id, telegramChatId);

          // Use the token in the URL instead of exposing IDs
          const registrationUrl = `${baseUrl}/telegram-patient/${token}`;

          console.log(
            "[new-thread] Registration URL generated:",
            registrationUrl.substring(0, 50) + "...",
          );

          // Send messages via Telegram bot
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) {
            throw new Error(
              "Telegram bot token is not defined in environment variables.",
            );
          }

          const bot = new TelegramBot(botToken);

          // Send messages to Telegram as separate messages
          try {
            await bot.sendMessage(telegramChatId, intakeMessage);
            await bot.sendMessage(telegramChatId, registrationUrl);
            console.log("[new-thread] Telegram messages sent successfully");
          } catch (telegramError: any) {
            console.error(
              `[new-thread][WARNING] Failed to send Telegram messages to chat ${telegramChatId}:`,
              telegramError.message || telegramError,
            );
            // Continue execution even if Telegram messages fail
          }
        } catch (intakeError) {
          // Log error but don't fail the request
          console.error("[new-thread] Error sending intake form:", intakeError);
        }
      }

      return NextResponse.json(
        {
          message: "Telegram thread and patient created successfully",
          thread,
        },
        { status: 200 },
      );
    } else {
      console.log("[new-thread] Thread already exists");

      return NextResponse.json(
        { message: "Telegram thread updated successfully", thread },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("[new-thread] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
