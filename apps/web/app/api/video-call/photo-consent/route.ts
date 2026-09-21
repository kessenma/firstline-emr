// app/api/video-call/photo-consent/route.ts
//
// The patient's answer to "may your doctor save photos during this call?".
//
// Public, gated on the invite token — the patient has no session. Recording the
// answer server-side rather than holding it in browser state does two things:
// it survives the patient reloading their page mid-call, and it leaves the only
// durable evidence that consent was given at all, which for a photograph
// entering a medical record is the point.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { resolveInviteSession } from "@/lib/server/videoCall";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const inviteToken: string | undefined = body?.inviteToken;
    const granted: unknown = body?.granted;

    if (typeof granted !== "boolean") {
      return NextResponse.json(
        { error: "granted must be a boolean" },
        { status: 400 },
      );
    }

    const lookup = await resolveInviteSession(inviteToken);
    if (!lookup.ok) {
      return lookup.reason === "ended"
        ? NextResponse.json({ error: "This call has ended" }, { status: 410 })
        : NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    const callSession = lookup.session;
    const now = new Date();

    await db
      .update(videoCallSessions)
      .set(
        granted
          ? {
              photoConsentAt: now,
              // Attributed to whoever started the call. That is the clinician
              // the patient is looking at — the consent prompt names them.
              photoConsentById: callSession.startedById,
              // Clear any earlier refusal so the record reads as the current
              // state rather than a contradiction.
              photoConsentDeniedAt: null,
              updatedAt: now,
            }
          : {
              photoConsentDeniedAt: now,
              photoConsentAt: null,
              photoConsentById: null,
              updatedAt: now,
            },
      )
      .where(eq(videoCallSessions.id, callSession.id));

    console.log("[video-call/photo-consent] recorded:", {
      sessionId: callSession.id,
      granted,
    });

    return NextResponse.json({ granted });
  } catch (error) {
    console.error("[video-call/photo-consent] failed:", error);
    return NextResponse.json(
      { error: "Failed to record consent" },
      { status: 500 },
    );
  }
}
