// app/api/telegram-thread/[telegramChatId]/reset-unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { validateTelegramChatId } from "@/lib/validation";
import {
  resetUnreadCount,
  getTelegramThreadByChatId,
} from "@/lib/telegram-db-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const { telegramChatId } = params;

    console.log(
      "[PATCH /api/telegram-thread/:telegramChatId/reset-unread-count] Called for chat ID:",
      telegramChatId,
    );

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[PATCH /api/telegram-thread/:telegramChatId/reset-unread-count] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if thread exists
    const thread = await getTelegramThreadByChatId(telegramChatId);
    if (!thread) {
      console.error(
        `[PATCH /api/telegram-thread/:telegramChatId/reset-unread-count] Thread not found for Chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Reset unread count
    const updated = await resetUnreadCount(telegramChatId);

    console.log(
      `[PATCH /api/telegram-thread/:telegramChatId/reset-unread-count] Reset unread count for chat ${telegramChatId}`,
    );

    return NextResponse.json({
      success: true,
      message: "Unread count reset successfully",
      unreadCount: updated.unreadCount,
      thread: updated,
    });
  } catch (error) {
    console.error(
      "[PATCH /api/telegram-thread/:telegramChatId/reset-unread-count] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to reset unread count" },
      { status: 500 },
    );
  }
}

// Support POST for backwards compatibility
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  return PATCH(request, props);
}
