// apps/web/app/api/user-notifications/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userNotifications, notifications, userMessages } from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Get all user notifications with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    // Support both web sessions and mobile JWT tokens
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || session.userId;
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const type = url.searchParams.get("type");
    const read = url.searchParams.get("read");

    // Build base query conditions
    let conditions = [eq(userNotifications.userId, userId)];

    // Add read filter if specified
    if (read === "true") {
      conditions.push(eq(userNotifications.read, true));
    } else if (read === "false") {
      conditions.push(eq(userNotifications.read, false));
    }

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(userNotifications)
      .innerJoin(
        notifications,
        eq(userNotifications.notificationId, notifications.id),
      )
      .where(
        and(
          ...conditions,
          ...(type && type !== "all"
            ? [eq(notifications.type, type as any)]
            : []),
        ),
      );

    const totalCount = totalCountResult[0]?.count || 0;

    // Get paginated notifications with notification details
    const userNotificationsData = await db
      .select({
        id: userNotifications.id,
        userId: userNotifications.userId,
        notificationId: userNotifications.notificationId,
        read: userNotifications.read,
        createdAt: userNotifications.createdAt,
        // Notification details
        message: notifications.message,
        notificationType: notifications.type,
        subject: notifications.subject,
        notificationCreatedAt: notifications.createdAt,
        patientId: notifications.patientId,
        redirectTo: notifications.redirectTo,
      })
      .from(userNotifications)
      .innerJoin(
        notifications,
        eq(userNotifications.notificationId, notifications.id),
      )
      .where(
        and(
          ...conditions,
          ...(type && type !== "all"
            ? [eq(notifications.type, type as any)]
            : []),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(skip);

    // Get user messages summary for unread count
    const userMessageSummary = await db
      .select({
        unreadCount: userMessages.unreadCount,
        lastReadAt: userMessages.lastReadAt,
      })
      .from(userMessages)
      .where(eq(userMessages.userId, userId))
      .limit(1);

    const summary = userMessageSummary[0] || {
      unreadCount: 0,
      lastReadAt: null,
    };

    return NextResponse.json({
      notifications: userNotificationsData,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      unreadCount: summary.unreadCount,
      lastReadAt: summary.lastReadAt,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// Create a new user notification
export async function POST(req: NextRequest) {
  try {
    // Support both web sessions and mobile JWT tokens
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const targetUserId = body.userId || session.userId;

    // Create the user notification
    const newUserNotification = await db
      .insert(userNotifications)
      .values({
        userId: targetUserId,
        notificationId: body.notificationId,
        read: body.read || false,
      })
      .returning();

    // Update the unread count if the notification is unread
    if (!body.read) {
      await db
        .update(userMessages)
        .set({
          unreadCount: sql`${userMessages.unreadCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userMessages.userId, targetUserId));
    }

    return NextResponse.json(newUserNotification[0], { status: 201 });
  } catch (error) {
    console.error("Error creating user notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 },
    );
  }
}
