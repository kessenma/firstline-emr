// app/api/video-call/[sessionId]/capture-token/route.ts
//
// Staff-only. Mints the 90-second credential the patient's browser presents
// when it uploads a captured still.
//
// The clinician has to come through here for every capture. That is the whole
// security model: the upload endpoint accepts no other authentication, so a
// leaked invite link cannot be used to push images into a chart without an
// authenticated clinician first asking for a token.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { isInviteExpired } from "@fajr/shared/video-call";
import { mintCaptureToken } from "@/lib/server/videoCall";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
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
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const callSession = await db.query.videoCallSessions.findFirst({
      where: eq(videoCallSessions.id, sessionId),
      columns: {
        id: true,
        patientId: true,
        isRevoked: true,
        status: true,
        expiresAt: true,
        photoConsentAt: true,
      },
    });

    if (!callSession) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (callSession.isRevoked || callSession.status === "expired") {
      return NextResponse.json(
        { error: "This call has ended" },
        { status: 410 },
      );
    }

    if (isInviteExpired(callSession.expiresAt)) {
      return NextResponse.json(
        { error: "This call link has expired" },
        { status: 410 },
      );
    }

    // Enforced here as well as in the UI. The clinician's button is disabled
    // until consent lands, but a disabled button is a courtesy, not a control.
    if (!callSession.photoConsentAt) {
      return NextResponse.json(
        { error: "The patient has not agreed to photos for this call" },
        { status: 403 },
      );
    }

    const captureToken = mintCaptureToken({
      sessionId: callSession.id,
      patientId: callSession.patientId,
      userId: session.userId,
    });

    return NextResponse.json({ captureToken });
  } catch (error) {
    console.error("[video-call/capture-token] failed:", error);
    return NextResponse.json(
      { error: "Failed to authorize capture" },
      { status: 500 },
    );
  }
}
