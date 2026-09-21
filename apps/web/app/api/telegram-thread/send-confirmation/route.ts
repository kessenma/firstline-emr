// app/api/telegram-thread/send-confirmation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  validateRequiredFields,
  validateTelegramChatId,
} from "@/lib/validation";
import { addMessageToThread } from "@/lib/telegram-db-helpers";
import type { TelegramMessage } from "@/db/schema";

export const dynamic = "force-dynamic";

const TELEGRAM_BOT_API_URL =
  process.env.TELEGRAM_BOT_API_URL || "https://api.telegram.org";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    console.log("[POST /api/telegram-thread/send-confirmation] Called with:", {
      chatId: body.chatId || body.telegramChatId,
      hasMessage: !!body.message,
    });

    // Support both chatId and telegramChatId for backwards compatibility
    const chatId = body.chatId || body.telegramChatId;
    const message = body.message;

    // Validate required fields
    const validation = validateRequiredFields({ chatId, message }, [
      "chatId",
      "message",
    ]);
    if (!validation.valid) {
      console.error(
        "[POST /api/telegram-thread/send-confirmation] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Validate chat ID format
    const chatValidation = validateTelegramChatId(chatId);
    if (!chatValidation.valid) {
      console.error(
        "[POST /api/telegram-thread/send-confirmation] Chat ID validation failed:",
        chatValidation.error,
      );
      return NextResponse.json(
        { error: chatValidation.error },
        { status: 400 },
      );
    }

    // Check Telegram bot token
    if (!TELEGRAM_BOT_TOKEN) {
      console.error(
        "[POST /api/telegram-thread/send-confirmation] Telegram bot token is missing",
      );
      return NextResponse.json(
        { error: "Telegram bot token is missing from environment variables." },
        { status: 500 },
      );
    }

    // Create confirmation message object
    const confirmationMessage: TelegramMessage = {
      id: randomUUID(),
      text: message,
      sender: "System",
      senderId: null,
      timestamp: new Date(),
      type: "text",
    };

    // Save message to thread in database
    try {
      const updated = await addMessageToThread(chatId, confirmationMessage);
      console.log(
        `[POST /api/telegram-thread/send-confirmation] Message saved to thread for chat ${chatId}`,
      );
    } catch (dbError) {
      console.error(
        "[POST /api/telegram-thread/send-confirmation] Failed to save message to database:",
        dbError,
      );
      // Continue to send via Telegram even if DB save fails
    }

    // Send message via Telegram Bot API
    console.log(
      `[POST /api/telegram-thread/send-confirmation] Sending message to Telegram chat ${chatId}`,
    );

    const telegramResponse = await fetch(
      `${TELEGRAM_BOT_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      },
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error(
        "[POST /api/telegram-thread/send-confirmation] Telegram API error:",
        errorData,
      );
      throw new Error(
        `Telegram API responded with status: ${telegramResponse.status}`,
      );
    }

    const telegramData = await telegramResponse.json();

    console.log(
      `[POST /api/telegram-thread/send-confirmation] Confirmation sent successfully to chat ${chatId}`,
    );

    return NextResponse.json({
      success: true,
      message: "Confirmation message sent successfully",
      confirmation: confirmationMessage,
      telegramResponse: telegramData,
      chatId,
    });
  } catch (error) {
    console.error(
      "[POST /api/telegram-thread/send-confirmation] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to send confirmation message" },
      { status: 500 },
    );
  }
}
