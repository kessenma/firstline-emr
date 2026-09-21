export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userFeedback, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  getOrCreateDirectThread,
  addMessageToInternalThread,
} from "@/lib/internal-messages-helpers";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/feedback/[id]/create-thread
 * Admin creates a 1:1 chat thread with the feedback submitter.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid feedback ID" },
        { status: 400 },
      );
    }

    // Get the feedback item
    const [feedback] = await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        title: userFeedback.title,
        threadId: userFeedback.threadId,
      })
      .from(userFeedback)
      .where(eq(userFeedback.id, id))
      .limit(1);

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    // If thread already exists, return it
    if (feedback.threadId) {
      return NextResponse.json({
        success: true,
        threadId: feedback.threadId,
        alreadyExists: true,
      });
    }

    // Get admin name
    const [adminUser] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const adminName = adminUser
      ? `${adminUser.firstName} ${adminUser.lastName}`
      : "Admin";

    // Create a 1:1 thread between admin and the feedback user
    const thread = await getOrCreateDirectThread(
      session.userId,
      feedback.userId,
    );

    // Link the thread to the feedback record
    await db
      .update(userFeedback)
      .set({ threadId: thread.id, updatedAt: new Date() })
      .where(eq(userFeedback.id, id));

    // Send an initial message
    await addMessageToInternalThread(thread.id, {
      text: `${adminName} started a conversation about your feedback: "${feedback.title}"`,
      sender: adminName,
      senderId: session.userId,
      type: "text",
    });

    console.log(
      `[feedback] Admin ${session.email} created chat thread for feedback ${id}`,
    );

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      alreadyExists: false,
    });
  } catch (error) {
    console.error("[feedback create-thread] Error:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
}
