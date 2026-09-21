// app/api/video-call/[sessionId]/route.ts
//
// Staff-only. Saves the optional free-text note a clinician can add after a
// call. Deliberately not a clinical note — auto-generating one per call would
// pollute the patient's timeline.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_NOTE_LENGTH = 5000;

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await props.params;
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const rawNotes = body?.callNotes;

    if (rawNotes != null && typeof rawNotes !== "string") {
      return NextResponse.json(
        { error: "callNotes must be a string" },
        { status: 400 },
      );
    }

    if (typeof rawNotes === "string" && rawNotes.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `callNotes must be ${MAX_NOTE_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    const callNotes =
      typeof rawNotes === "string" && rawNotes.trim().length > 0
        ? rawNotes.trim()
        : null;

    const [updated] = await db
      .update(videoCallSessions)
      .set({ callNotes, updatedAt: new Date() })
      .where(eq(videoCallSessions.id, sessionId))
      .returning({ id: videoCallSessions.id });

    if (!updated) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[video-call/:sessionId] PATCH failed:", error);
    return NextResponse.json(
      { error: "Failed to save call notes" },
      { status: 500 },
    );
  }
}
