// app/api/telegram-thread/[telegramChatId]/send-photo/route.ts
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
      "[POST /api/telegram-thread/:telegramChatId/send-photo] Called for chat ID:",
      telegramChatId,
    );

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-photo] Validation failed:",
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
        "[POST /api/telegram-thread/:telegramChatId/send-photo] Missing required fields:",
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
        `[POST /api/telegram-thread/:telegramChatId/send-photo] Thread not found for chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get sender name from session
    const { firstName, lastName, id } = session.user as any;
    const senderName =
      `${firstName || ""} ${lastName || ""}`.trim() || "System";
    const senderId = id || null;

    // Create caption with sender signature
    const updatedCaption = caption
      ? `${caption}\n\n-- ${senderName}`
      : `-- ${senderName}`;

    console.log(
      `[POST /api/telegram-thread/:telegramChatId/send-photo] Sending photo to Telegram chat ${telegramChatId}`,
    );

    // Check Telegram bot token
    if (!TELEGRAM_BOT_TOKEN) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-photo] Telegram bot token is missing",
      );
      return NextResponse.json(
        { error: "Telegram bot token is not configured" },
        { status: 500 },
      );
    }

    // Send photo to Telegram Bot API
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

    const telegramResponse = await fetch(TELEGRAM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        photo: mediaUrl,
        caption: updatedCaption,
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-photo] Telegram API error:",
        errorText,
      );
      return NextResponse.json(
        { error: "Failed to send photo to Telegram", details: errorText },
        { status: telegramResponse.status },
      );
    }

    const telegramData = await telegramResponse.json();

    console.log(
      `[POST /api/telegram-thread/:telegramChatId/send-photo] Photo sent to Telegram successfully`,
    );

    // Remove query parameters from media URL for storage
    const publicMediaUrl = mediaUrl.split("?")[0];

    // Save message to database
    const newMessage: TelegramMessage = {
      id: randomUUID(),
      text: updatedCaption || "Image",
      sender: senderName,
      senderId: senderId,
      timestamp: new Date(),
      type: "image",
      mediaUrl: publicMediaUrl,
    };

    try {
      await addMessageToThread(telegramChatId, newMessage);
      console.log(
        `[POST /api/telegram-thread/:telegramChatId/send-photo] Photo message saved to database`,
      );
    } catch (dbError) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-photo] Failed to save message to database:",
        dbError,
      );
      // Continue even if DB save fails - photo was sent to Telegram
    }

    return NextResponse.json({
      success: true,
      message: "Photo sent and saved successfully",
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
      "[POST /api/telegram-thread/:telegramChatId/send-photo] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to send photo" },
      { status: 500 },
    );
  }
}
