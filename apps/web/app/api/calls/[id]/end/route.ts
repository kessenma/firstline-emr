// app/api/calls/[id]/end/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { calls, callParticipants } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { RoomServiceClient } from "livekit-server-sdk";
import {
  getCallForParticipant,
  livekitApiUrl,
  logCallToThread,
  notifyMissedCall,
  resolveTerminalStatus,
} from "@/lib/calls";
import { sendVoipCallPush } from "@/lib/voipPush";

const TERMINAL_STATUSES = [
  "completed",
  "missed",
  "declined",
  "canceled",
  "failed",
];

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: callId } = await props.params;
  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason : null;

  try {
    const row = await getCallForParticipant(callId, session.userId);
    if (!row) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const { call, participant } = row;

    // Already torn down — idempotent.
    if (TERMINAL_STATUSES.includes(call.status)) {
      return NextResponse.json({ ok: true, call });
    }

    const now = new Date();

    await db
      .update(callParticipants)
      .set({
        status: participant.status === "accepted" ? "left" : "missed",
        leftAt: now,
        updatedAt: now,
      })
      .where(eq(callParticipants.id, participant.id));

    // How many accepted participants are still connected?
    const remaining = await db
      .select({ id: callParticipants.id })
      .from(callParticipants)
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.status, "accepted"),
          ne(callParticipants.userId, session.userId),
        ),
      );

    // A 1:1 call ends when either side leaves; a group call ends when fewer
    // than two people remain.
    const shouldEndCall = remaining.length < 2;

    if (!shouldEndCall) {
      return NextResponse.json({ ok: true, call });
    }

    const declinedCallees = await db
      .select({ id: callParticipants.id })
      .from(callParticipants)
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.role, "callee"),
          eq(callParticipants.status, "declined"),
        ),
      );

    const allCallees = await db
      .select({ id: callParticipants.id, userId: callParticipants.userId })
      .from(callParticipants)
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.role, "callee"),
        ),
      );

    const answered = call.answeredAt != null;
    const { status, endReason } = resolveTerminalStatus({
      answered,
      reason,
      everyCalleeDeclined:
        allCallees.length > 0 && declinedCallees.length === allCallees.length,
    });

    const durationSeconds = call.answeredAt
      ? Math.max(
          0,
          Math.round((now.getTime() - call.answeredAt.getTime()) / 1000),
        )
      : null;

    const [updated] = await db
      .update(calls)
      .set({
        status,
        endedAt: now,
        endReason,
        durationSeconds,
        updatedAt: now,
      })
      .where(eq(calls.id, callId))
      .returning();

    // Anyone still ringing when the call ends was missed, not left hanging.
    const stillRinging = await db
      .update(callParticipants)
      .set({ status: "missed", updatedAt: now })
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.status, "ringing"),
        ),
      )
      .returning({ userId: callParticipants.userId });

    // Dismiss the CallKit UI on every device that was still ringing.
    if (stillRinging.length > 0) {
      void Promise.all(
        stillRinging.map((p) =>
          sendVoipCallPush({
            userId: p.userId,
            callId,
            event: "cancel",
            callerId: call.initiatorId,
            callerName: "",
            reason: endReason === "timeout" ? "timeout" : "canceled",
          }),
        ),
      ).catch((err) => console.error("VoIP cancel fan-out failed:", err));

      // These are the only genuine misses on the whole call: still ringing when
      // it ended. Fire-and-forget so a notification failure cannot fail the
      // hang-up.
      void notifyMissedCall({
        callId,
        initiatorId: call.initiatorId,
        missedUserIds: stillRinging
          .map((p) => p.userId)
          // The caller hanging up on their own unanswered call has not
          // "missed" anything.
          .filter((id) => id !== call.initiatorId),
      });
    }

    // Post the call into the participants' staff thread. Runs for every
    // terminal outcome, not just answered calls — a missed call is exactly
    // what you want a record of. Fire-and-forget.
    void logCallToThread({
      callId,
      initiatorId: call.initiatorId,
      // allCallees is the callee set; the initiator is a participant too.
      participantIds: Array.from(
        new Set([call.initiatorId, ...allCallees.map((c) => c.userId)]),
      ),
      kind: call.kind,
      status,
      startedAt: call.startedAt,
      durationSeconds,
    });

    // Best-effort room teardown so a leaked token can't rejoin an ended call.
    void deleteRoom(call.roomName).catch((err) =>
      console.error(`Failed to delete LiveKit room ${call.roomName}:`, err),
    );

    return NextResponse.json({ ok: true, call: updated });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

async function deleteRoom(roomName: string): Promise<void> {
  // Must go through livekitApiUrl(): RoomServiceClient speaks the Twirp HTTP
  // API, and a `wss://` URL fails at request time rather than at construction.
  // Reading process.env.LIVEKIT_URL raw here would silently never delete a
  // room, because the failure is swallowed by the caller's best-effort catch.
  const url = livekitApiUrl();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return;

  const client = new RoomServiceClient(url, apiKey, apiSecret);
  await client.deleteRoom(roomName);
}
