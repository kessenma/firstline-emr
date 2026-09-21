// apps/web/app/api/user-notifications/[userId]/mark-all-read/route.ts
// This route handles marking all notifications as read for a specific user
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userNotifications, userMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
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

  // Security check: Only allow users to mark their own notifications as read
  if (userId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Update all unread notifications to read for this user
    await db
      .update(userNotifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(eq(userNotifications.userId, userId));

    // Update the user messages unread count to 0
    await db
      .update(userMessages)
      .set({
        unreadCount: 0,
        lastReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userMessages.userId, userId));

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 },
    );
  }
}
