// app/api/video-call/[sessionId]/upload-audio/route.ts
//
// Durability backup for a consult's audio while its transcript is being
// written on the clinician's phone.
//
// This is NOT how transcription gets its input — that reads the local file.
// This exists for one case: the phone is lost, wiped or reinstalled before the
// transcript is written, and the audio would otherwise be gone with it.
//
// Consequently the object is short-lived by design. The client deletes it as
// soon as the transcript is persisted (DELETE ../audio), which on the happy
// path is minutes. Anything left behind is a crash between those two steps.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage/storage-service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
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
      columns: { id: true, transcriptionConsent: true },
    });
    if (!callSession) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Server-side enforcement. Client-side gating alone is not a control, and
    // storing consult audio the patient refused would be the worst possible
    // outcome of this feature.
    if (callSession.transcriptionConsent !== "granted") {
      return NextResponse.json(
        { error: "Transcription was not consented to for this call" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const speaker = formData.get("speaker");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (speaker !== "doctor" && speaker !== "patient") {
      return NextResponse.json(
        { error: "speaker must be doctor or patient" },
        { status: 400 },
      );
    }

    const result = await storageService.upload({
      file,
      fileName: `${speaker}.m4a`,
      contentType: file.type || "audio/mp4",
      basePath: `call-audio/${sessionId}`,
      metadata: {
        speaker,
        sessionId,
        uploadedAt: new Date().toISOString(),
      },
      signedUrlExpiry: 3600,
    });

    return NextResponse.json({ filePath: result.filePath });
  } catch (error) {
    console.error("[video-call/upload-audio] failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
