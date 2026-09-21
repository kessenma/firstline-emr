import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { admins } from "@/db/schema";
import {
  createGroupThread,
  addMessageToInternalThread,
} from "@/lib/internal-messages-helpers";

/**
 * POST /api/internal-messages/contact-admin
 *
 * Creates (or returns) a group thread between the current user and all admins.
 * Thread title: "Support - {userName}"
 * Sends an initial system message when the thread is first created.
 */
export async function POST(req: NextRequest) {
  const session = await verifySessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all admin user IDs
    const adminRecords = await db
      .select({ userId: admins.userId })
      .from(admins);

    if (adminRecords.length === 0) {
      return NextResponse.json(
        { error: "No admin users found" },
        { status: 404 },
      );
    }

    const adminUserIds = adminRecords.map((a) => a.userId);

    // Don't create a thread with yourself if the user is already an admin
    const otherAdminIds = adminUserIds.filter((id) => id !== session.userId);
    if (otherAdminIds.length === 0) {
      return NextResponse.json(
        { error: "You are the only admin — no one to contact" },
        { status: 400 },
      );
    }

    const userName =
      [session.firstName, session.lastName].filter(Boolean).join(" ") ||
      session.email ||
      "User";
    const threadTitle = `Support - ${userName}`;

    const { thread, existing } = await createGroupThread(
      session.userId,
      otherAdminIds,
      threadTitle,
    );

    // Send initial message only for newly created threads
    if (!existing) {
      const sender =
        [session.firstName, session.lastName].filter(Boolean).join(" ") ||
        session.email ||
        "Unknown User";

      await addMessageToInternalThread(thread.id, {
        text: `${sender} has a question for the admin team.`,
        sender: "System",
        senderId: session.userId,
        type: "text",
      });
    }

    return NextResponse.json({ threadId: thread.id, existing });
  } catch (error) {
    console.error("Error creating contact-admin thread:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
