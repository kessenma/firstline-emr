// app/api/telegram-thread/[telegramChatId]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { validateTelegramChatId } from "@/lib/validation";
import { deleteTelegramThread } from "@/lib/telegram-db-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
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
      `[DELETE /api/telegram-thread/:telegramChatId/delete] Received DELETE request for chat ID: ${telegramChatId}`,
    );

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[DELETE /api/telegram-thread/:telegramChatId/delete] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Delete thread (cascade will handle participants and follow-ups)
    console.log(
      `[DELETE /api/telegram-thread/:telegramChatId/delete] Deleting thread for chat ID: ${telegramChatId}`,
    );
    const deleted = await deleteTelegramThread(telegramChatId);

    if (!deleted) {
      console.error(
        `[DELETE /api/telegram-thread/:telegramChatId/delete] Thread not found for chat ID: ${telegramChatId}`,
      );
      return NextResponse.json(
        { error: "Telegram thread not found" },
        { status: 404 },
      );
    }

    console.log(
      `[DELETE /api/telegram-thread/:telegramChatId/delete] Thread deleted successfully for chat ID: ${telegramChatId}`,
    );

    return NextResponse.json({
      success: true,
      message: "Telegram thread deleted successfully",
      deletedThread: {
        id: deleted.id,
        chatId: deleted.chatId,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "[DELETE /api/telegram-thread/:telegramChatId/delete] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to delete telegram thread" },
      { status: 500 },
    );
  }
}
