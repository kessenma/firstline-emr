// app/api/user-messages/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session || !session.userId || session.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user messages record
    const messages = await db
      .select()
      .from(userMessages)
      .where(eq(userMessages.userId, userId))
      .limit(1);

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(messages[0]);
  } catch (error) {
    console.error("Error retrieving user messages:", error);
    return NextResponse.json(
      { error: "Failed to retrieve user messages" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session || !session.userId || session.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Build update object
    const updates: any = {};

    if (body.lastReadAt !== undefined) {
      updates.lastReadAt = new Date(body.lastReadAt);
    }

    if (body.unreadCount !== undefined) {
      updates.unreadCount = body.unreadCount;
    }

    // Mark all as read if requested
    if (body.markAllAsRead) {
      updates.lastReadAt = new Date();
      updates.unreadCount = 0;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();

      // Update the user messages record
      await db
        .update(userMessages)
        .set(updates)
        .where(eq(userMessages.userId, userId));
    }

    // Get the updated record
    const updatedMessages = await db
      .select()
      .from(userMessages)
      .where(eq(userMessages.userId, userId))
      .limit(1);

    if (!updatedMessages || updatedMessages.length === 0) {
      return NextResponse.json(
        { error: "Messages not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedMessages[0]);
  } catch (error) {
    console.error("Error updating user messages:", error);
    return NextResponse.json(
      { error: "Failed to update user messages" },
      { status: 500 },
    );
  }
}
