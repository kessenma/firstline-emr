// apps/web/app/api/patient/follow-up/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { telegramThreads } from "@/db/schema";
import { validateApiKey } from "@/utils/telegram/validateApiKey";
import { and, lt, eq } from "drizzle-orm";

export async function GET(request: Request) {
  // Validate API Key
  const authHeader = request.headers.get("Authorization");
  if (!validateApiKey(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the cutoff time (24 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    // Find Telegram threads needing follow-up
    const followUps = await db
      .select({ chatId: telegramThreads.chatId })
      .from(telegramThreads)
      .where(
        and(
          lt(telegramThreads.createdAt, cutoffTime), // Older than 24 hours
          eq(telegramThreads.status, "active"), // Thread is still active
        ),
      );

    console.log(
      `[DEBUG] Found ${followUps.length} threads needing follow-up (older than 24 hours).`,
    );

    return NextResponse.json({ followUps });
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
