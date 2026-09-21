// app/api/video-call/media/delete/route.ts
//
// Lets the patient remove a photo taken during their own call.
//
// The scope is the point: the delete only matches rows whose
// `video_call_session_id` is this call. A patient can withdraw a photograph
// they just watched being taken; they cannot reach anything else in their
// chart, which is a clinical record they do not author.
//
// Hard delete — row, object, and thumbnail. Hiding a photo someone asked to
// have removed while it stays in storage would honour the request in name only.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patientMedia } from "@/db/schema";
import { storageService } from "@/lib/storage";
import { resolveInviteSession } from "@/lib/server/videoCall";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const mediaId: unknown = body?.mediaId;

    const lookup = await resolveInviteSession(body?.inviteToken);
    if (!lookup.ok) {
      return lookup.reason === "ended"
        ? NextResponse.json({ error: "This call has ended" }, { status: 410 })
        : NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    if (typeof mediaId !== "string" || !UUID_REGEX.test(mediaId)) {
      return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
    }

    const [media] = await db
      .select({ id: patientMedia.id, url: patientMedia.url })
      .from(patientMedia)
      .where(
        and(
          eq(patientMedia.id, mediaId),
          // Both predicates matter. Session alone would be enough today, but
          // pairing it with the patient makes the intent explicit and survives
          // any future change that reuses session ids.
          eq(patientMedia.videoCallSessionId, lookup.session.id),
          eq(patientMedia.patientId, lookup.session.patientId),
        ),
      );

    if (!media) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const objectDeleted = await storageService.deleteObject(media.url);
    await db.delete(patientMedia).where(eq(patientMedia.id, mediaId));

    console.log("[video-call/media/delete] patient removed a capture:", {
      mediaId,
      sessionId: lookup.session.id,
      objectDeleted,
    });

    return NextResponse.json({ success: true, mediaId });
  } catch (error) {
    console.error("[video-call/media/delete] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete the photo" },
      { status: 500 },
    );
  }
}
