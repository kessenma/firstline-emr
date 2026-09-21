// app/api/video-call/join/route.ts
//
// Public, but gated on a signed single-purpose invite token — this is how the
// patient joins from their browser. Replaces the old /api/get-livekit-token,
// which minted a token for any room name anyone cared to POST.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videoCallSessions, userSettings } from "@/db/schema";
import { isInviteExpired, staffDisplayName } from "@fajr/shared/video-call";
import { normalizeLanguage } from "@fajr/shared/constants/languages";
import { getLiveKitConfig, mintPatientToken } from "@/lib/server/videoCall";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const inviteToken: string | undefined = body?.inviteToken;

    // 64 hex chars — reject anything else before touching the database.
    if (!inviteToken || !/^[0-9a-f]{64}$/i.test(inviteToken)) {
      return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    const callSession = await db.query.videoCallSessions.findFirst({
      where: eq(videoCallSessions.inviteToken, inviteToken),
      with: {
        patient: { columns: { id: true, firstName: true, language: true } },
        startedBy: { columns: { id: true, firstName: true, lastName: true } },
      },
    });

    // Same response for "no such invite" as for a malformed one, so this
    // endpoint can't be used to probe which tokens exist.
    if (!callSession) {
      return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    if (callSession.isRevoked || callSession.status === "expired") {
      return NextResponse.json(
        { error: "This call has ended" },
        { status: 410 },
      );
    }

    if (isInviteExpired(callSession.expiresAt)) {
      // Reflect the lapse in the log so history doesn't show a stuck `pending`.
      if (callSession.status === "pending") {
        await db
          .update(videoCallSessions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(videoCallSessions.id, callSession.id));
      }
      return NextResponse.json(
        { error: "This call link has expired" },
        { status: 410 },
      );
    }

    // Only ask the patient about transcription if the clinician has actually
    // turned it on. Asking otherwise trains people to dismiss a consent prompt
    // that never had any consequence, which devalues it when it does.
    let transcriptionOffered = false;
    if (callSession.startedBy?.id) {
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, callSession.startedBy.id),
        columns: { callTranscriptionMode: true },
      });
      transcriptionOffered =
        !!settings?.callTranscriptionMode &&
        settings.callTranscriptionMode !== "off";
    }

    const config = getLiveKitConfig();

    const ttlSeconds = Math.max(
      60,
      Math.floor((callSession.expiresAt.getTime() - Date.now()) / 1000),
    );

    const token = await mintPatientToken({
      config,
      roomName: callSession.roomName,
      patientId: callSession.patientId,
      // First name only — the room name already carries the id, and there is
      // no reason to render a full patient name to the other participant.
      displayName: callSession.patient?.firstName || "Patient",
      ttlSeconds,
    });

    return NextResponse.json({
      roomName: callSession.roomName,
      serverUrl: config.serverUrl,
      token,
      hostName: callSession.startedBy
        ? staffDisplayName(callSession.startedBy)
        : null,
      // Normalized server-side so the client never has to reason about the
      // free-text `patients.language` column, which holds anything the intake
      // form or an admin edit put there.
      language: normalizeLanguage(callSession.patient?.language),
      // So a reload mid-call doesn't ask the patient a second time.
      photoConsentGranted: Boolean(callSession.photoConsentAt),
      // Whether to show the transcription consent prompt at all, and what the
      // patient already said if they are rejoining.
      transcriptionOffered,
      transcriptionConsent: callSession.transcriptionConsent ?? null,
    });
  } catch (error) {
    console.error("[video-call/join] failed:", error);
    return NextResponse.json(
      { error: "Failed to join video call" },
      { status: 500 },
    );
  }
}
