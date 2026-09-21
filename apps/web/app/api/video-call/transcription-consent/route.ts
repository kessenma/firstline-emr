// app/api/video-call/transcription-consent/route.ts
//
// The patient's answer to "may the doctor's phone write notes from this call?".
//
// Public, gated on the invite token — the patient has no session. Mirrors
// photo-consent deliberately: separate ask, separate record. Agreeing to be
// photographed and agreeing to have the conversation transcribed are different
// things, and one standing "yes" must not stand in for the other.
//
// This row is the authoritative record. The clinician's device learns the
// answer over the LiveKit data channel because it needs to act on it in
// real time, but the data channel is not evidence — this is.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { resolveInviteSession } from "@/lib/server/videoCall";

/**
 * Bumped whenever the consent wording changes.
 *
 * Stored per decision, because "the patient consented" is close to meaningless
 * without knowing which text they were shown.
 */
const PROMPT_VERSION = "v1-2026-08";

const VALID_DECISIONS = ["granted", "declined", "withdrawn"] as const;
type Decision = (typeof VALID_DECISIONS)[number];

function isDecision(value: unknown): value is Decision {
  return (
    typeof value === "string" &&
    (VALID_DECISIONS as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const inviteToken: string | undefined = body?.inviteToken;
    const decision: unknown = body?.decision;
    const locale: unknown = body?.locale;

    if (!isDecision(decision)) {
      return NextResponse.json(
        { error: "decision must be granted, declined or withdrawn" },
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
      .set({
        transcriptionConsent: decision,
        transcriptionConsentAt: now,
        transcriptionConsentLocale:
          typeof locale === "string" ? locale.slice(0, 16) : null,
        transcriptionConsentPromptVersion: PROMPT_VERSION,
        updatedAt: now,
      })
      .where(eq(videoCallSessions.id, callSession.id));

    return NextResponse.json({ ok: true, decision });
  } catch (error) {
    console.error("[video-call/transcription-consent] failed:", error);
    return NextResponse.json(
      { error: "Failed to record consent" },
      { status: 500 },
    );
  }
}
