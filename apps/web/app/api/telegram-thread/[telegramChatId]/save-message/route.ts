// app/api/telegram-thread/[telegramChatId]/save-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifySessionFromRequest } from "@/lib/dal";
import { getServerSession } from "next-auth";
import {
  validateTelegramChatId,
  validateRequiredFields,
} from "@/lib/validation";
import {
  getTelegramThreadByChatId,
  addMessageToThread,
  incrementUnreadCount,
} from "@/lib/telegram-db-helpers";
import type { TelegramMessage } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication (session, mobile JWT, or bearer token)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    const authHeader = request.headers.get("authorization");

    // Check if any valid authentication method is present
    const hasSession = !!session;
    const hasMobileUser = !!(session && session.userId);
    const hasBearerToken = authHeader && authHeader.startsWith("Bearer ");

    if (!hasSession && !hasMobileUser && !hasBearerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If using a bearer token, verify it matches the MEDFLOW_KEY (for system integrations)
    if (hasBearerToken && !hasSession && !hasMobileUser) {
      const token = authHeader.substring(7);
      if (token !== process.env.MEDFLOW_KEY) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    // Extract telegramChatId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const telegramChatId = pathParts[pathParts.indexOf("telegram-thread") + 1];

    console.log(
      "[PATCH /api/telegram-thread/:telegramChatId/save-message] Called for chat ID:",
      telegramChatId,
    );

    if (!telegramChatId) {
      return NextResponse.json({ error: "Missing chat ID" }, { status: 400 });
    }

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[PATCH /api/telegram-thread/:telegramChatId/save-message] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse the request body
    const messageData = await request.json();

    // Validate required fields
    const fieldValidation = validateRequiredFields(messageData, [
      "text",
      "sender",
    ]);
    if (!fieldValidation.valid) {
      console.error(
        "[PATCH /api/telegram-thread/:telegramChatId/save-message] Missing required fields:",
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
        `[PATCH /api/telegram-thread/:telegramChatId/save-message] Thread not found for chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create a new message with proper structure
    const newMessage: TelegramMessage = {
      id: randomUUID(),
      text: messageData.text || "",
      sender: messageData.sender || "Unknown",
      senderId: messageData.senderId || null,
      timestamp: messageData.timestamp
        ? new Date(messageData.timestamp)
        : new Date(),
      type: messageData.type || "text",
      mediaUrl: messageData.mediaUrl || undefined,
      replyTo: messageData.replyTo || undefined,
      forwardedFrom: messageData.forwardedFrom || undefined,
    };

    console.log(
      `[PATCH /api/telegram-thread/:telegramChatId/save-message] Saving message to thread ${telegramChatId}`,
    );

    // Add the message to the thread
    const updatedThread = await addMessageToThread(telegramChatId, newMessage);

    // Increment unread count
    await incrementUnreadCount(telegramChatId, 1);

    console.log(
      `[PATCH /api/telegram-thread/:telegramChatId/save-message] Message saved successfully`,
    );

    // Get the saved message (last message in the array)
    const messages = (updatedThread.messages as TelegramMessage[]) || [];
    const savedMessage = messages[messages.length - 1];

    // Real-time WebSocket broadcasting removed

    return NextResponse.json({
      success: true,
      savedMessage: {
        id: savedMessage.id,
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        timestamp: savedMessage.timestamp,
        type: savedMessage.type,
        mediaUrl: savedMessage.mediaUrl,
      },
    });
  } catch (error) {
    console.error(
      "[PATCH /api/telegram-thread/:telegramChatId/save-message] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 },
    );
  }
}
