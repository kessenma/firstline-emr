// apps/web/app/api/notifications/mark-all-read/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";

import { markAllNotificationsAsRead } from "@/utils/notifications";

// PATCH: Mark all notifications as read for a user
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

  // Get the user ID from the URL
  const { id: userId } = await props.params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Ensure the user can only mark their own notifications as read
  if (userId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const success = await markAllNotificationsAsRead(userId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
