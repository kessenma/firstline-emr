// app/api/video-call/end/route.ts
//
// Staff-only. Ends a call the clinician deliberately hung up on: revokes the
// invite so the link stops working immediately rather than at its natural
// expiry, AND closes the room on the SFU so a patient who is already connected
// is disconnected instead of left sitting in an empty room.
//
// This is for responsiveness, NOT for the log: startedAt/endedAt/duration are
// owned by the LiveKit webhook, which fires whether or not this ever runs.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { closeLiveKitRoom } from "@/lib/server/videoCall";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const sessionId: string | undefined = body?.sessionId;

    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: "A valid sessionId is required" },
        { status: 400 },
      );
    }

    const callSession = await db.query.videoCallSessions.findFirst({
      where: eq(videoCallSessions.id, sessionId),
    });

    if (!callSession) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Don't overwrite a terminal state the webhook already settled.
    const isTerminal =
      callSession.status === "completed" ||
      callSession.status === "missed" ||
      callSession.status === "expired";

    await db
      .update(videoCallSessions)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
        ...(isTerminal ? {} : { endedReason: "ended_by_staff" }),
      })
      .where(eq(videoCallSessions.id, sessionId));

    // After the revoke, not before: the database is the durable record, and
    // closing the room fires the webhook that reads it back.
    await closeLiveKitRoom(callSession.roomName);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[video-call/end] failed:", error);
    return NextResponse.json(
      { error: "Failed to end video call" },
      { status: 500 },
    );
  }
}
