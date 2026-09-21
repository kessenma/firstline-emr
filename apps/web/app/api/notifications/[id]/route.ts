// apps/web/app/api/notifications/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";

import {
  createNotificationForMultipleUsers,
  getUserNotifications,
  markNotificationAsRead,
} from "@/utils/notifications";
import { pushNotificationService } from "@/lib/pushNotifications";

// GET: Fetch notifications for a specific user
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user ID from the URL
  const { id: userId } = await props.params;

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

  // Use query parameters for pagination
  const { searchParams } = new URL(request.url);
  const skip = Number(searchParams.get("skip")) || 0;
  const limit = Number(searchParams.get("limit")) || 20;

  try {
    const notifications = await getUserNotifications(userId, skip, limit);
    return NextResponse.json({ notifications });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching notifications:", error);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Create a new notification for a specific user
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user ID from the URL
  const { id: userId } = await props.params;
  const {
    message,
    type,
    patientId,
    methods = ["in-app"],
    additionalRecipients = [],
  } = await request.json();

  if (!message || message.trim() === "") {
    return NextResponse.json(
      { error: "Message cannot be empty" },
      { status: 400 },
    );
  }

  try {
    // Include the primary recipient and any additional recipients
    const allRecipients = [
      userId,
      ...additionalRecipients.filter((id: string) => id !== userId),
    ];

    const { notification } = await createNotificationForMultipleUsers({
      message,
      type: type || "message",
      recipientIds: allRecipients,
      sourceId: session.userId,
      patientId,
      methods,
    });

    // Send push notifications to all recipients
    try {
      await pushNotificationService.sendNotificationToUsers(allRecipients, {
        title: "New Notification",
        body: message,
        data: {
          type: "notification",
          notificationId: notification.id,
          patientId: patientId,
        },
        sound: "default",
        badge: 1,
      });
      console.log(
        `📱 Sent push notifications to ${allRecipients.length} users`,
      );
    } catch (pushError) {
      console.error("❌ Failed to send push notifications:", pushError);
      // Don't fail the request if push notifications fail
    }

    return NextResponse.json(notification);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error creating notification:", error);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH: Mark a notification as read
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the notification ID from the URL
  const { id: notificationId } = await props.params;

  if (!notificationId) {
    return NextResponse.json(
      { error: "Notification ID is required" },
      { status: 400 },
    );
  }

  try {
    const success = await markNotificationAsRead(
      notificationId,
      session.userId,
    );

    if (!success) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error marking notification as read:", error);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
