// apps/web/app/api/messages/unread-count/[userId]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET: Fetch unread message count for a specific user
export async function GET(request: NextRequest) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract `userId` from dynamic pathname
  const userId = request.nextUrl.pathname.split("/").pop();

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Validate UUID (PostgreSQL)
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

  try {
    // Find user messages record
    const [userMessagesRecord] = await db
      .select()
      .from(userMessages)
      .where(eq(userMessages.userId, userId))
      .limit(1);

    return NextResponse.json({
      unreadCount: userMessagesRecord?.unreadCount ?? 0,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error fetching unread message count:", error);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
