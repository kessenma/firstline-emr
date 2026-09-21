import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getUnreadCount } from "@/lib/telegram-db-helpers";

export const dynamic = "force-dynamic";

/**
 * Batch fetch unread message counts for multiple Telegram chat IDs
 * 
 * @param chatIds - Array of Telegram chat IDs
 * @returns Map of chatId -> unread message count
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const session = await verifySessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { chatIds } = body;
    
    // Validate input
    if (!Array.isArray(chatIds)) {
      return NextResponse.json(
        { error: "chatIds must be an array" }, 
        { status: 400 }
      );
    }

    if (chatIds.length === 0) {
      console.log("[Batch] Empty chatIds array, returning empty map");
      return NextResponse.json({}, { status: 200 });
    }

    console.log(`[Batch] Fetching unread messages for ${chatIds.length} chats`);

    // Initialize result map
    const unreadMessagesMap: Record<string, number> = {};

    // Parallel individual fetches using existing getUnreadCount
    const results = await Promise.allSettled(
      chatIds.map(async (chatId: string) => {
        try {
          const count = await getUnreadCount(chatId);
          return { chatId, count };
        } catch (error) {
          console.error(`[Batch] Error fetching unread for ${chatId}:`, error);
          return { chatId, count: 0 }; // Default to 0 on error
        }
      })
    );

    // Process results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { chatId, count } = result.value as { chatId: string; count: number };
        unreadMessagesMap[chatId] = count;
      }
    });

    console.log(
      `[Batch] Successfully fetched unread messages for ${Object.keys(unreadMessagesMap).length}/${chatIds.length} chats`
    );

    return NextResponse.json(unreadMessagesMap, { status: 200 });

  } catch (error: any) {
    console.error("[Batch] Error in batch unread messages fetch:", error.message);
    return NextResponse.json(
      { 
        error: "Failed to fetch batch unread messages",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
