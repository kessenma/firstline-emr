// app/api/telegram-thread/list-media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { telegramThreads, type TelegramMessage } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  validateTelegramChatId,
  validateLimit,
  validateOffset,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const limit = validateLimit(
      searchParams.get("limit") || undefined,
      50,
      200,
    );
    const offset = validateOffset(searchParams.get("offset") || undefined);
    const mediaType = searchParams.get("mediaType"); // Optional: 'image', 'video', 'audio', 'file'

    console.log("[GET /api/telegram-thread/list-media] Called with params:", {
      chatId,
      limit,
      offset,
      mediaType,
    });

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required" },
        { status: 400 },
      );
    }

    // Validate chat ID
    const validation = validateTelegramChatId(chatId);
    if (!validation.valid) {
      console.error(
        "[GET /api/telegram-thread/list-media] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get thread with messages
    const [thread] = await db
      .select({ messages: telegramThreads.messages })
      .from(telegramThreads)
      .where(eq(telegramThreads.chatId, chatId))
      .limit(1);

    if (!thread) {
      console.error(
        `[GET /api/telegram-thread/list-media] Thread not found for chat ID: ${chatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const messages = (thread.messages as TelegramMessage[]) || [];

    // Filter for media messages (image, video, audio, file)
    const mediaTypes = ["image", "video", "audio", "file"];
    let mediaMessages = messages.filter((msg) => mediaTypes.includes(msg.type));

    // Apply media type filter if specified
    if (mediaType && mediaTypes.includes(mediaType)) {
      mediaMessages = mediaMessages.filter((msg) => msg.type === mediaType);
    }

    // Sort by timestamp (newest first)
    mediaMessages.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Apply pagination
    const total = mediaMessages.length;
    const paginatedMedia = mediaMessages.slice(offset, offset + limit);

    console.log(
      `[GET /api/telegram-thread/list-media] Found ${total} media items, returning ${paginatedMedia.length}`,
    );

    return NextResponse.json({
      media: paginatedMedia,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      chatId,
    });
  } catch (error) {
    console.error("[GET /api/telegram-thread/list-media] Error:", error);
    return NextResponse.json(
      { error: "Failed to list media" },
      { status: 500 },
    );
  }
}
