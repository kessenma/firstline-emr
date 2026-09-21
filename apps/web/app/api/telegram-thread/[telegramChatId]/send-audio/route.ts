// app/api/telegram-thread/[telegramChatId]/send-audio/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  validateTelegramChatId,
  validateRequiredFields,
} from "@/lib/validation";
import {
  getTelegramThreadByChatId,
  addMessageToThread,
} from "@/lib/telegram-db-helpers";
import type { TelegramMessage } from "@/db/schema";

export const dynamic = "force-dynamic";

const TELEGRAM_BOT_API_URL =
  process.env.TELEGRAM_BOT_API_URL || "https://api.telegram.org";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(
  request: Request,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized access. Please log in." },
        { status: 401 },
      );
    }

    const params = await props.params;
    const { telegramChatId } = params;

    console.log(
      "[POST /api/telegram-thread/:telegramChatId/send-audio] Called for chat ID:",
      telegramChatId,
    );

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-audio] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { mediaUrl, caption } = body;

    // Validate required fields
    const fieldValidation = validateRequiredFields({ mediaUrl }, ["mediaUrl"]);
    if (!fieldValidation.valid) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-audio] Missing required fields:",
        fieldValidation.error,
      );
      return NextResponse.json(
        { error: fieldValidation.error },
        { status: 400 },
      );
    }

    // Check if thread exists
    const thread = await getTelegramThreadByChatId(telegramChatId);
    if (!thread) {
      console.error(
        `[POST /api/telegram-thread/:telegramChatId/send-audio] Thread not found for chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get sender name from session
    const { firstName, lastName, id } = session.user as any;
    const senderName =
      `${firstName || ""} ${lastName || ""}`.trim() || "Unknown Sender";
    const senderId = id || null;

    // Create caption with sender signature
    const updatedCaption = caption
      ? `${caption} - Sent by ${senderName}`
      : `Audio message - Sent by ${senderName}`;

    console.log(
      `[POST /api/telegram-thread/:telegramChatId/send-audio] Sending audio to Telegram chat ${telegramChatId}`,
    );

    // Check Telegram bot token
    if (!TELEGRAM_BOT_TOKEN) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-audio] Telegram bot token is missing",
      );
      return NextResponse.json(
        { error: "Telegram bot token is not configured" },
        { status: 500 },
      );
    }

    // Send audio to Telegram Bot API
    const telegramResponse = await fetch(
      `${TELEGRAM_BOT_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendAudio`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          audio: mediaUrl,
          caption: updatedCaption,
        }),
      },
    );

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-audio] Telegram API error:",
        {
          status: telegramResponse.status,
          statusText: telegramResponse.statusText,
          body: errorText,
          mediaUrl: mediaUrl,
        },
      );
      return NextResponse.json(
        {
          error: "Failed to send audio to Telegram",
          details: errorText,
          mediaURL: mediaUrl,
        },
        { status: telegramResponse.status },
      );
    }

    const telegramData = await telegramResponse.json();

    console.log(
      `[POST /api/telegram-thread/:telegramChatId/send-audio] Audio sent to Telegram successfully`,
    );

    // Remove query parameters from media URL for storage (extract base URL from signed URL)
    const publicMediaUrl = mediaUrl.split("?")[0];

    // Save message to database
    const newMessage: TelegramMessage = {
      id: randomUUID(),
      text: updatedCaption || "Audio message",
      sender: senderName,
      senderId: senderId,
      timestamp: new Date(),
      type: "audio",
      mediaUrl: publicMediaUrl,
    };

    try {
      await addMessageToThread(telegramChatId, newMessage);
      console.log(
        `[POST /api/telegram-thread/:telegramChatId/send-audio] Audio message saved to database`,
      );
    } catch (dbError) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-audio] Failed to save message to database:",
        dbError,
      );
      // Continue even if DB save fails - audio was sent to Telegram
    }

    return NextResponse.json({
      success: true,
      message: "Audio sent and saved successfully",
      telegramResponse: telegramData,
      savedMessage: {
        id: newMessage.id,
        text: newMessage.text,
        sender: newMessage.sender,
        senderId: newMessage.senderId,
        timestamp: newMessage.timestamp,
        type: newMessage.type,
        mediaUrl: newMessage.mediaUrl,
      },
    });
  } catch (error) {
    console.error(
      "[POST /api/telegram-thread/:telegramChatId/send-audio] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to send audio" },
      { status: 500 },
    );
  }
}
