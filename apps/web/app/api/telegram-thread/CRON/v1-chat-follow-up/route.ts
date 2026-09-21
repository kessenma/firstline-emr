// apps/web/app/api/telegram-thread/CRON/v1-chat-follow-up/route.ts

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/telegram/validateApiKey";
import { db } from "@/db";
import { telegramThreads } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";

/**
 * GET /api/telegram-thread/CRON/v1-chat-follow-up
 *
 * CRON job endpoint to find threads that need follow-up.
 * Identifies threads that are:
 * - Older than 1 minute (configurable cutoff)
 * - Still active
 * - Need follow-up attention
 *
 * This endpoint is designed to be called by a scheduled job/cron system.
 *
 * @returns Array of threads needing follow-up with chat IDs and messages
 *
 * @example
 * curl -H "Authorization: Bearer YOUR_API_KEY" \
 *   http://localhost:3000/api/telegram-thread/CRON/v1-chat-follow-up
 *
 * Response:
 * {
 *   "followUps": [
 *     {
 *       "id": "uuid",
 *       "chatId": "123456789",
 *       "messages": [...],
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  // Verify authentication
  const authHeader = req.headers.get("authorization");
  if (!validateApiKey(authHeader)) {
    console.warn("[v1-chat-follow-up] Unauthorized - Invalid API key");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[v1-chat-follow-up] CRON job started");

    // Calculate cutoff time (threads older than 1 minute)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 1);

    console.log(
      "[v1-chat-follow-up] Looking for threads created before:",
      cutoffTime.toISOString(),
    );

    // Find Telegram threads needing follow-up
    // Criteria:
    // - Created before cutoff time (older than 1 minute)
    // - Status is active (not archived)
    const followUpThreads = await db
      .select({
        id: telegramThreads.id,
        chatId: telegramThreads.chatId,
        messages: telegramThreads.messages,
        createdAt: telegramThreads.createdAt,
        unreadCount: telegramThreads.unreadCount,
        status: telegramThreads.status,
      })
      .from(telegramThreads)
      .where(
        and(
          lt(telegramThreads.createdAt, cutoffTime),
          eq(telegramThreads.status, "active"),
        ),
      );

    console.log(
      `[v1-chat-follow-up] Found ${followUpThreads.length} threads needing follow-up`,
    );

    // Format response for compatibility with existing consumers
    const followUps = followUpThreads.map((thread) => ({
      id: thread.id,
      chatId: thread.chatId,
      messages: thread.messages || [],
      createdAt: thread.createdAt,
      unreadCount: thread.unreadCount,
      status: thread.status,
    }));

    return NextResponse.json({ followUps }, { status: 200 });
  } catch (error) {
    console.error("[v1-chat-follow-up] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
