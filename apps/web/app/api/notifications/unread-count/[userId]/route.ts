// apps/web/app/api/notifications/unread-count/[userId]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userNotifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET: Fetch unread notification count for a specific user
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user ID from the URL
  const { userId } = await props.params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Ensure userId is a valid UUID (PostgreSQL)
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    );

  if (!isUUID) {
    return NextResponse.json(
      { error: "Invalid User ID format (UUID expected)" },
      { status: 400 },
    );
  }

  // Verify the user is requesting their own unread count or is an admin
  if (session.userId !== userId && session.accountType !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: You can only view your own notification count" },
      { status: 403 },
    );
  }

  try {
    // Count unread notifications for this user
    const unreadNotifications = await db
      .select()
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.read, false),
        ),
      );

    const unreadCount = unreadNotifications.length;

    return NextResponse.json({ unreadCount });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching unread notification count:", error);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
