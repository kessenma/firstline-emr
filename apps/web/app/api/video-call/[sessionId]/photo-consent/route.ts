// app/api/video-call/[sessionId]/photo-consent/route.ts
//
// Staff-side read of the patient's photo-consent answer.
//
// The clinician normally learns the answer from the RPC response, which is
// faster. This exists for when that response never arrives — a timeout, a
// reconnect, a reopened chart — because the RPC is only the notification. The
// database is what actually decides whether the shutter is armed, and this is
// how the clinician's client re-reads it.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
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
        photoConsentAt: true,
        photoConsentDeniedAt: true,
      },
    });

    if (!callSession) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({
      granted: Boolean(callSession.photoConsentAt),
      grantedAt: callSession.photoConsentAt,
      deniedAt: callSession.photoConsentDeniedAt,
    });
  } catch (error) {
    console.error("[video-call/photo-consent GET] failed:", error);
    return NextResponse.json(
      { error: "Failed to read consent" },
      { status: 500 },
    );
  }
}
