// app/api/patient/[id]/media/[mediaId]/route.ts
//
// Staff-only deletion of a single patient media item.
//
// The delete is permanent: the row goes, the object goes, and the derived
// thumbnail goes. There is no soft-delete tombstone. That matches every other
// media delete in this codebase (mission attachments, user photos), and it is
// the right answer for the case this route mostly serves — a photo captured
// seconds ago during a video consult that the patient asked to have removed.
// Honouring that halfway, by hiding the row while the image sits in storage,
// would be worse than not offering deletion at all.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patientMedia } from "@/db/schema";
import { storageService } from "@/lib/storage";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; mediaId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId, mediaId } = await props.params;

    if (!UUID_REGEX.test(patientId) || !UUID_REGEX.test(mediaId)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    // Scoped to the patient in the path, not just the media id. Without the
    // second predicate this route would delete any media row in the database
    // given its id, with the patient segment along for decoration.
    const [media] = await db
      .select({ id: patientMedia.id, url: patientMedia.url })
      .from(patientMedia)
      .where(
        and(
          eq(patientMedia.id, mediaId),
          eq(patientMedia.patientId, patientId),
        ),
      );

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Best-effort. `deleteObject` never throws; if storage is unreachable the
    // row still goes, because a chart entry pointing at a file nobody can
    // fetch is the failure the user actually experiences.
    const objectDeleted = await storageService.deleteObject(media.url);
    if (!objectDeleted) {
      console.warn(
        "[patient/media] Object delete failed, removing row anyway:",
        media.url,
      );
    }

    await db.delete(patientMedia).where(eq(patientMedia.id, mediaId));

    console.log("[patient/media] Deleted media:", {
      mediaId,
      patientId,
      deletedBy: session.userId,
      objectDeleted,
    });

    return NextResponse.json({ success: true, mediaId, objectDeleted });
  } catch (error) {
    console.error("[patient/media] Delete failed:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 },
    );
  }
}
