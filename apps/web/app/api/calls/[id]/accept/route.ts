// app/api/calls/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { calls, callParticipants } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import {
  getCallForParticipant,
  livekitServerUrl,
  mintStaffCallToken,
} from "@/lib/calls";
import { sendVoipCallPush } from "@/lib/voipPush";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: callId } = await props.params;

  // Body is optional — CallKit answers may post nothing.
  const body = await req.json().catch(() => null);
  const clientPlatform =
    typeof body?.clientPlatform === "string" ? body.clientPlatform : null;

  const displayName =
    `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() ||
    session.email ||
    "Staff";

  try {
    const row = await getCallForParticipant(callId, session.userId);
    if (!row) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const { call, participant } = row;

    // Idempotent: answering twice (a CallKit retry, a reconnect) must not 409.
    const alreadyIn =
      participant.status === "accepted" && call.status === "active";

    if (!alreadyIn && !["ringing", "active"].includes(call.status)) {
      return NextResponse.json(
        { error: `Call is ${call.status}` },
        { status: 409 },
      );
    }

    let current = call;

    if (!alreadyIn) {
      const now = new Date();

      current = await db.transaction(async (tx) => {
        await tx
          .update(callParticipants)
          .set({
            status: "accepted",
            joinedAt: participant.joinedAt ?? now,
            clientPlatform: clientPlatform ?? participant.clientPlatform,
            updatedAt: now,
          })
          .where(eq(callParticipants.id, participant.id));

        // Only the first accept flips the call to active and stamps answeredAt.
        // The status guard makes this a no-op for the second accepter.
        const [next] = await tx
          .update(calls)
          .set({
            status: "active",
            answeredAt: call.answeredAt ?? now,
            updatedAt: now,
          })
          .where(and(eq(calls.id, callId), eq(calls.status, "ringing")))
          .returning();

        return next ?? call;
      });

      // Stop every other device ringing. Includes this user's own other
      // devices — that is what CXCallEndedReason.answeredElsewhere is for.
      const otherRinging = await db
        .select({ userId: callParticipants.userId })
        .from(callParticipants)
        .where(
          and(
            eq(callParticipants.callId, callId),
            eq(callParticipants.status, "ringing"),
            ne(callParticipants.userId, session.userId),
          ),
        );

      const cancelTargets = [
        session.userId,
        ...otherRinging.map((p) => p.userId),
      ];

      void Promise.all(
        cancelTargets.map((userId) =>
          sendVoipCallPush({
            userId,
            callId,
            event: "cancel",
            callerId: call.initiatorId,
            callerName: displayName,
            reason: "answered_elsewhere",
          }),
        ),
      ).catch((err) => console.error("VoIP cancel fan-out failed:", err));
    }

    const token = await mintStaffCallToken({
      roomName: current.roomName,
      userId: session.userId,
      displayName,
      kind: current.kind,
    });

    return NextResponse.json({
      token,
      url: livekitServerUrl(),
      roomName: current.roomName,
      call: {
        id: current.id,
        status: current.status,
        answeredAt: current.answeredAt,
      },
    });
  } catch (error) {
    console.error("Error accepting call:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
