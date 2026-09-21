// apps/web/app/api/telegram-thread/save-follow-up/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/telegram/validateApiKey";
import { createFollowUp } from "@/lib/telegram-db-helpers";
import { isValidUuid } from "@/lib/validation";

/**
 * PATCH /api/telegram-thread/save-follow-up
 *
 * Saves a follow-up record for a Telegram thread.
 * Used to track when follow-up messages are sent to patients.
 *
 * @body { chatId: string, telegramThreadId: string, message?: string }
 * @returns Created follow-up record
 *
 * @example
 * curl -X PATCH http://localhost:3000/api/telegram-thread/save-follow-up \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "chatId": "123456789",
 *     "telegramThreadId": "uuid-here",
 *     "message": "Follow-up sent"
 *   }'
 *
 * Response:
 * {
 *   "followUp": {
 *     "id": "uuid",
 *     "chatId": "123456789",
 *     "telegramThreadId": "uuid",
 *     "message": "Follow-up sent",
 *     "followUpSentAt": "2024-01-01T00:00:00.000Z",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
export async function PATCH(req: NextRequest) {
  // Verify authentication
  const authHeader = req.headers.get("authorization");
  if (!(await validateApiKey(authHeader))) {
    console.warn("[save-follow-up] Unauthorized - Invalid API key");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { chatId, telegramThreadId, message } = body;

    console.log("[save-follow-up] Request for thread:", telegramThreadId);

    // Validate required fields
    if (!chatId || !telegramThreadId) {
      console.error("[save-follow-up] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: chatId and telegramThreadId" },
        { status: 400 },
      );
    }

    // Validate thread ID format
    if (!isValidUuid(telegramThreadId)) {
      console.error(
        "[save-follow-up] Invalid thread ID format:",
        telegramThreadId,
      );
      return NextResponse.json(
        { error: "Invalid thread ID format" },
        { status: 400 },
      );
    }

    console.log("[save-follow-up] Creating follow-up record for chat:", chatId);

    // Save the follow-up record
    const followUp = await createFollowUp({
      chatId,
      telegramThreadId,
      message: message || "",
      followUpSentAt: new Date(),
    });

    console.log("[save-follow-up] Follow-up saved with ID:", followUp.id);

    return NextResponse.json({ followUp }, { status: 200 });
  } catch (error) {
    console.error("[save-follow-up] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
