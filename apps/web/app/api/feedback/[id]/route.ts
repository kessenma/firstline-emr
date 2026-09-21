// app/api/feedback/[id]/route.ts
// Get single feedback with fresh signed URLs, and admin update status/notes

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { userFeedback, users, internalMessageThreads } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { FeedbackAttachment } from "@/db/schema/userFeedback";
import { addMessageToInternalThread } from "@/lib/internal-messages-helpers";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/feedback/[id]
 * Get single feedback item with fresh signed URLs for attachments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid feedback ID" }, { status: 400 });
    }

    const [item] = await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        category: userFeedback.category,
        title: userFeedback.title,
        description: userFeedback.description,
        attachments: userFeedback.attachments,
        appSections: userFeedback.appSections,
        platform: userFeedback.platform,
        mobilePlatform: userFeedback.mobilePlatform,
        status: userFeedback.status,
        adminNotes: userFeedback.adminNotes,
        syncDiagnostics: userFeedback.syncDiagnostics,
        appVersion: userFeedback.appVersion,
        threadId: userFeedback.threadId,
        reviewedBy: userFeedback.reviewedBy,
        reviewedAt: userFeedback.reviewedAt,
        createdAt: userFeedback.createdAt,
        updatedAt: userFeedback.updatedAt,
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .where(eq(userFeedback.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Non-admins can only view their own feedback
    if (!session.isAdmin && item.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate fresh signed URLs for attachments
    const attachments = (item.attachments || []) as FeedbackAttachment[];
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att) => {
        try {
          const signedUrl = await storageService.getSignedUrl(att.filePath, 3600);
          return { ...att, signedUrl };
        } catch {
          return { ...att, signedUrl: null };
        }
      }),
    );

    return NextResponse.json({
      feedback: {
        ...item,
        attachments: attachmentsWithUrls,
      },
    });
  } catch (error) {
    console.error("[feedback GET /id] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/feedback/[id]
 * Admin updates status, adminNotes, or reviewedBy.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid feedback ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, adminNotes } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) {
      const validStatuses = ["open", "in_review", "resolved", "closed"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 },
        );
      }
      updateData.status = status;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    // Set reviewer info when status changes
    if (status && status !== "open") {
      updateData.reviewedBy = session.userId;
      updateData.reviewedAt = new Date();
    }

    const [updated] = await db
      .update(userFeedback)
      .set(updateData)
      .where(eq(userFeedback.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Archive the linked chat thread when feedback is resolved or closed
    if (
      (status === "resolved" || status === "closed") &&
      updated.threadId
    ) {
      try {
        const [adminUser] = await db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);

        const adminName = adminUser
          ? `${adminUser.firstName} ${adminUser.lastName}`
          : "Admin";

        await addMessageToInternalThread(updated.threadId, {
          text: `${adminName} has ${status} this feedback.`,
          sender: adminName,
          senderId: session.userId,
          type: "text",
        });

        await db
          .update(internalMessageThreads)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(internalMessageThreads.id, updated.threadId));
      } catch (err) {
        console.error("[feedback] Failed to archive thread:", err);
      }
    }

    console.log(
      `[feedback] Admin ${session.email} updated feedback ${id}: status=${status || "unchanged"}`,
    );

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error("[feedback PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 },
    );
  }
}
