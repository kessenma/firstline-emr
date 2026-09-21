// app/api/video-call/patient/[patientId]/route.ts
//
// Staff-only. Call history for a patient chart, newest first.
//
// Mobile normally reads this from PowerSync so the section still renders
// offline; this route backs the web chart and serves as mobile's online
// fallback.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import {
  staffDisplayName,
  type VideoCallSession,
} from "@fajr/shared/video-call";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ patientId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientId } = await props.params;
    if (!patientId || !UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient id" },
        { status: 400 },
      );
    }

    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT,
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const rows = await db.query.videoCallSessions.findMany({
      where: eq(videoCallSessions.patientId, patientId),
      orderBy: [desc(videoCallSessions.createdAt)],
      limit,
      with: {
        startedBy: { columns: { firstName: true, lastName: true } },
      },
    });

    // inviteToken is deliberately not mapped — history consumers never need
    // the join credential.
    const sessions: VideoCallSession[] = rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      roomName: row.roomName,
      startedById: row.startedById,
      startedByName: row.startedBy ? staffDisplayName(row.startedBy) : null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      patientJoinedAt: row.patientJoinedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      durationSeconds: row.durationSeconds,
      endedReason: row.endedReason,
      callNotes: row.callNotes,
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[video-call/patient/:id] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load call history" },
      { status: 500 },
    );
  }
}
