// app/api/feedback/[id]/attachment-url/route.ts
// Regenerate a signed URL for a feedback attachment

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { userFeedback } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { FeedbackAttachment } from "@/db/schema/userFeedback";

/**
 * GET /api/feedback/[id]/attachment-url?filePath=...
 * Regenerate a signed URL for a specific attachment.
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
    const filePath = request.nextUrl.searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath query parameter is required" },
        { status: 400 },
      );
    }

    // Verify the feedback exists and user has access
    const [item] = await db
      .select({
        userId: userFeedback.userId,
        attachments: userFeedback.attachments,
      })
      .from(userFeedback)
      .where(eq(userFeedback.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    if (!session.isAdmin && item.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the filePath is actually an attachment of this feedback
    const attachments = (item.attachments || []) as FeedbackAttachment[];
    const found = attachments.some((att) => att.filePath === filePath);
    if (!found) {
      return NextResponse.json(
        { error: "Attachment not found on this feedback" },
        { status: 404 },
      );
    }

    const signedUrl = await storageService.getSignedUrl(filePath, 3600);

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error("[feedback attachment-url] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate attachment URL" },
      { status: 500 },
    );
  }
}
