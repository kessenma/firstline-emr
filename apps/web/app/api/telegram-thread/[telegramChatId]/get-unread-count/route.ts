// app/api/telegram-thread/[telegramChatId]/get-unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { validateTelegramChatId } from "@/lib/validation";
import { getUnreadCount } from "@/lib/telegram-db-helpers";

export const dynamic = "force-dynamic";

export async function GET(
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
      "[GET /api/telegram-thread/:telegramChatId/get-unread-count] Called for chat ID:",
      telegramChatId,
    );

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[GET /api/telegram-thread/:telegramChatId/get-unread-count] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get unread count (returns 0 if thread not found)
    const unreadCount = await getUnreadCount(telegramChatId);

    console.log(
      `[GET /api/telegram-thread/:telegramChatId/get-unread-count] Unread count for chat ${telegramChatId}:`,
      unreadCount,
    );

    return NextResponse.json({
      unreadCount,
      chatId: telegramChatId,
    });
  } catch (error) {
    console.error(
      "[GET /api/telegram-thread/:telegramChatId/get-unread-count] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 },
    );
  }
}
