// app/api/video-call/[sessionId]/audio/route.ts
//
// Deletes a consult's backup audio once its transcript is safely written.
//
// The client calls this immediately after persisting the note, so on the happy
// path the audio lives for minutes. There is deliberately no scheduled sweep
// backing this up — see docs; the client also retries the delete on its next
// launch for any job that crashed between transcribing and cleaning up.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage/storage-service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    if (!UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const callSession = await db.query.videoCallSessions.findFirst({
      where: eq(videoCallSessions.id, sessionId),
      columns: { id: true },
    });
    if (!callSession) {
      // Already gone is the desired end state, not an error worth retrying.
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const environment = storageService.getEnvironmentPrefix();
    const deleted = await storageService.deleteByPrefix(
      `${environment}/call-audio/${sessionId}`,
    );

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("[video-call/audio] delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
