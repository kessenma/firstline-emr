// apps/web/app/api/telegram-thread/[telegramChatId]/update-translations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getTelegramThreadByChatId } from "@/lib/telegram-db-helpers";
import { db } from "@/db";
import { telegramThreads } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TelegramMessage } from "@/db/schema/telegramThreads";

/**
 * PATCH /api/telegram-thread/[telegramChatId]/update-translations
 *
 * Updates translation fields for specific messages in a thread.
 * Requires authentication (session).
 *
 * @param telegramChatId - Telegram chat ID (from URL path)
 * @param body - Array of message updates with { id, translatedText, isTranslated, showTranslated }
 * @returns Success status
 *
 * @example
 * curl -X PATCH -H "Cookie: next-auth.session-token=..." \
 *   -H "Content-Type: application/json" \
 *   -d '{"translations": [{"id": "msg123", "translatedText": "Hello", "isTranslated": true, "showTranslated": true}]}' \
 *   http://localhost:3000/api/telegram-thread/123456789/update-translations
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);
  if (!session) {
    console.warn("[update-translations] Unauthorized - No valid user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const { telegramChatId } = params;

  console.log(
    "[update-translations] PATCH request for chat ID:",
    telegramChatId,
  );

  if (!telegramChatId) {
    console.error("[update-translations] Telegram Chat ID is missing");
    return NextResponse.json(
      { error: "Telegram Chat ID is required" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { translations } = body;

    if (!Array.isArray(translations) || translations.length === 0) {
      return NextResponse.json(
        { error: "Translations array is required" },
        { status: 400 },
      );
    }

    console.log(
      `[update-translations] Updating ${translations.length} message(s)`,
    );

    // Fetch the current thread
    const thread = await getTelegramThreadByChatId(telegramChatId);

    if (!thread) {
      console.error(
        `[update-translations] Thread not found for Chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Update messages with translations
    const messages = (thread.messages || []) as TelegramMessage[];
    const translationMap = new Map(
      translations.map((t: any) => [t.id, t]),
    );

    const updatedMessages = messages.map((msg) => {
      const translation = translationMap.get(msg.id);
      if (translation) {
        return {
          ...msg,
          translatedText: translation.translatedText,
          isTranslated: translation.isTranslated,
          showTranslated: translation.showTranslated,
        };
      }
      return msg;
    });

    // Save updated messages to database
    await db
      .update(telegramThreads)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(telegramThreads.chatId, telegramChatId));

    console.log(
      `[update-translations] Successfully updated translations for chat ${telegramChatId}`,
    );

    return NextResponse.json({
      success: true,
      updatedCount: translations.length,
    });
  } catch (error) {
    console.error("[update-translations] Error updating translations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
