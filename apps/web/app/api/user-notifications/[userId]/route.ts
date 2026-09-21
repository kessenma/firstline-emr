// apps/web/app/api/user-notifications/[userId]/route.ts
// This route handles operations for a specific user's notifications
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";

import { getUserNotifications } from "@/utils/notifications";

// GET: Fetch notifications for a specific user
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> },
) {
  // Support both web sessions and mobile JWT tokens
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Access params using the same pattern as your working example
  const params = await props.params;
  const userId = params.userId;

  // Security check: Only allow users to access their own notifications
  if (userId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Use query parameters for pagination
  const { searchParams } = new URL(request.url);
  const skip = Number(searchParams.get("skip")) || 0;
  const limit = Number(searchParams.get("limit")) || 20;

  try {
    const notifications = await getUserNotifications(userId, skip, limit);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
