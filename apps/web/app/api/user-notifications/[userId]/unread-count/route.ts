// apps/web/app/api/user-notifications/[userId]/unread-count/route.ts
// This route handles getting the unread count for a specific user
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  // Support both web sessions and mobile JWT tokens
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await context.params;

  // Security check: Only allow users to access their own unread count
  if (userId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const userMessageRecord = await db
      .select({
        unreadCount: userMessages.unreadCount,
      })
      .from(userMessages)
      .where(eq(userMessages.userId, userId))
      .limit(1);

    const unreadCount = userMessageRecord[0]?.unreadCount || 0;

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 },
    );
  }
}
