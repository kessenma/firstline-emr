// app/api/video-call/start/route.ts
//
// Staff-only. Starts (or rejoins) a video consult for a patient and returns
// both the clinician's LiveKit token and a shareable invite link.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, videoCallSessions } from "@/db/schema";
import {
  VIDEO_CALL_INVITE_TTL_MS,
  buildInviteUrl,
  buildRoomName,
} from "@fajr/shared/video-call";
import { normalizeLanguage } from "@fajr/shared/constants/languages";
import {
  generateInviteToken,
  generateRoomSuffix,
  getAppBaseUrl,
  getLiveKitConfig,
  mintStaffToken,
} from "@/lib/server/videoCall";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const patientId: string | undefined = body?.patientId;

    if (!patientId || !UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "A valid patientId is required" },
        { status: 400 },
      );
    }

    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      columns: { id: true, language: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const config = getLiveKitConfig();
    const now = new Date();

    // Reuse a live invite rather than minting a second room for the same
    // patient: a clinician who reopens the chart mid-call should rejoin the
    // room the patient is already sitting in, not strand them in an empty one.
    const existing = await db.query.videoCallSessions.findFirst({
      where: and(
        eq(videoCallSessions.patientId, patientId),
        eq(videoCallSessions.isRevoked, false),
        gt(videoCallSessions.expiresAt, now),
      ),
      orderBy: [desc(videoCallSessions.createdAt)],
    });

    const reusable =
      existing &&
      (existing.status === "pending" || existing.status === "active")
        ? existing
        : null;

    let sessionRow = reusable;

    if (!sessionRow) {
      const roomName = buildRoomName(patientId, generateRoomSuffix());
      const expiresAt = new Date(now.getTime() + VIDEO_CALL_INVITE_TTL_MS);

      const [created] = await db
        .insert(videoCallSessions)
        .values({
          patientId,
          roomName,
          startedById: session.userId,
          inviteToken: generateInviteToken(),
          expiresAt,
          status: "pending",
        })
        .returning();

      sessionRow = created;
    }

    // TTL is bounded by the invite expiry so a token can never outlive the
    // link that authorized it.
    const ttlSeconds = Math.max(
      60,
      Math.floor((sessionRow.expiresAt.getTime() - now.getTime()) / 1000),
    );

    const token = await mintStaffToken({
      config,
      roomName: sessionRow.roomName,
      userId: session.userId,
      firstName: session.firstName,
      lastName: session.lastName,
      ttlSeconds,
    });

    const language = normalizeLanguage(patient.language);

    return NextResponse.json({
      sessionId: sessionRow.id,
      roomName: sessionRow.roomName,
      serverUrl: config.serverUrl,
      token,
      // The language rides in the link so the patient's browser can translate
      // its connecting and error screens, which render before it has joined
      // and therefore before the server can tell it anything.
      inviteUrl: buildInviteUrl(
        getAppBaseUrl(),
        sessionRow.inviteToken,
        language,
      ),
      // Also returned on its own so the clinician's app can compose the
      // Telegram invite in the patient's language without re-parsing the URL.
      language,
      expiresAt: sessionRow.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[video-call/start] failed:", error);
    return NextResponse.json(
      { error: "Failed to start video call" },
      { status: 500 },
    );
  }
}
