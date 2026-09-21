export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missionAttachments } from "@/db/schema/missionAttachments";
import { storageService } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { missionId } = await params;
    const { attachmentId } = await request.json();

    if (!attachmentId) {
      return NextResponse.json(
        { message: "Attachment ID is required" },
        { status: 400 },
      );
    }

    // Find the attachment to get its file path
    const [attachment] = await db
      .select({ filePath: missionAttachments.filePath })
      .from(missionAttachments)
      .where(
        and(
          eq(missionAttachments.id, attachmentId),
          eq(missionAttachments.missionId, missionId),
        ),
      );

    if (!attachment) {
      return NextResponse.json(
        { message: "Attachment not found" },
        { status: 404 },
      );
    }

    // Delete file from object storage
    await storageService.deleteByPrefix(attachment.filePath);

    // Delete row from database
    await db
      .delete(missionAttachments)
      .where(eq(missionAttachments.id, attachmentId));

    return NextResponse.json(
      { message: "Attachment deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting mission attachment:", error);
    return NextResponse.json(
      { message: "Failed to delete attachment" },
      { status: 500 },
    );
  }
}
