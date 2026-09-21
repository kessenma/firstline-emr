// apps/web/app/api/test-mobile-auth/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/mobileAuth";

import {
  createNotificationForMultipleUsers,
  getUserNotifications,
  markNotificationAsRead,
} from "@/utils/notifications";

// GET: Fetch notifications for a specific user
export async function GET(request: NextRequest) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  const session = await getServerSession(authOptions);
  const user = getUserFromRequest(request, session);

  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use user ID from authenticated user
  const userId = user.id;

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
export async function POST(request: NextRequest) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  const session = await getServerSession(authOptions);
  const user = getUserFromRequest(request, session);

  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use user ID from authenticated user
  const userId = user.id;
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
      sourceId: user.id,
      patientId,
      methods,
    });

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
export async function PATCH(request: NextRequest) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  const session = await getServerSession(authOptions);
  const user = getUserFromRequest(request, session);

  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the notification ID from query params
  const { searchParams } = new URL(request.url);
  const notificationId = searchParams.get("id");

  if (!notificationId) {
    return NextResponse.json(
      { error: "Notification ID is required" },
      { status: 400 },
    );
  }

  try {
    const success = await markNotificationAsRead(notificationId, user.id);

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
