// app/api/calls/route.ts
// Place a staff-to-staff call.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { calls, callParticipants, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  ensureStaffRoom,
  evaluateCallees,
  isValidUuid,
  livekitServerUrl,
  mintStaffCallToken,
  staffRoomName,
} from "@/lib/calls";
import { sendVoipCallPush } from "@/lib/voipPush";

export async function POST(req: NextRequest) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const kind: "audio" | "video" = body?.kind === "video" ? "video" : "audio";
    const overrideQuietHours = body?.overrideQuietHours === true;

    const calleeIds: string[] = Array.isArray(body?.calleeIds)
      ? Array.from(
          new Set(
            body.calleeIds.filter(
              (id: unknown): id is string =>
                typeof id === "string" && isValidUuid(id) && id !== session.userId,
            ),
          ),
        )
      : [];

    if (calleeIds.length === 0) {
      return NextResponse.json(
        { error: "At least one valid callee is required" },
        { status: 400 },
      );
    }

    // Only authorized staff can be called.
    const validCallees = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, calleeIds), eq(users.authorized, true)));

    if (validCallees.length !== calleeIds.length) {
      return NextResponse.json(
        { error: "One or more callees are not authorized staff" },
        { status: 400 },
      );
    }

    const evaluations = await evaluateCallees(calleeIds);

    // Quiet hours: warn the caller and create nothing until they confirm.
    // A live call is allowed to break quiet hours, but not silently.
    if (!overrideQuietHours) {
      const quiet = evaluations.filter(
        (e) => e.inQuietHours && e.notificationsAllowed,
      );
      if (quiet.length > 0) {
        return NextResponse.json(
          {
            error: "quiet_hours",
            callees: quiet.map((e) => ({
              id: e.id,
              name: e.name,
              until: e.quietHoursEnd,
            })),
          },
          { status: 409 },
        );
      }
    }

    // Reachable = will actually ring a device. Distinct from quiet hours and
    // NOT overridable by the caller.
    const reachable = evaluations.filter(
      (e) => e.notificationsAllowed && e.hasVoipDevice,
    );

    const callerName =
      `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() ||
      session.email ||
      "Unknown caller";

    // Generate the id up front so roomName can be derived from it in a single
    // insert rather than an insert-then-patch.
    const callId = randomUUID();
    const startedAt = new Date();

    const call = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(calls)
        .values({
          id: callId,
          roomName: staffRoomName(callId),
          kind,
          status: "ringing",
          initiatorId: session.userId,
          isGroupCall: calleeIds.length > 1,
          startedAt,
        })
        .returning();

      await tx.insert(callParticipants).values([
        {
          callId,
          userId: session.userId,
          role: "caller",
          // The caller is implicitly "in" the call from the moment they place it.
          status: "accepted",
          invitedAt: startedAt,
          joinedAt: startedAt,
        },
        ...calleeIds.map((id) => ({
          callId,
          userId: id,
          role: "callee" as const,
          status: "ringing" as const,
          invitedAt: startedAt,
        })),
      ]);

      return created;
    });

    // Create the room before anyone can join it, so it gets a cap sized to this
    // call rather than the 1:1 consult default that `room.auto_create` would
    // otherwise apply. Awaited: the caller's token is handed out immediately
    // below, and a room auto-created by that join would keep the wrong cap.
    await ensureStaffRoom({
      roomName: call.roomName,
      participantCount: calleeIds.length + 1,
    });

    // Ring everyone reachable. Fire-and-forget: a slow APNs round-trip must not
    // delay handing the caller their token.
    void Promise.all(
      reachable.map((e) =>
        sendVoipCallPush({
          userId: e.id,
          callId: call.id,
          event: "invite",
          callerId: session.userId,
          callerName,
        }),
      ),
    ).catch((err) => console.error("VoIP invite fan-out failed:", err));

    const token = await mintStaffCallToken({
      roomName: call.roomName,
      userId: session.userId,
      displayName: callerName,
      kind,
    });

    return NextResponse.json({
      call: {
        id: call.id,
        roomName: call.roomName,
        kind: call.kind,
        status: call.status,
        startedAt: call.startedAt,
      },
      token,
      url: livekitServerUrl(),
      // False when nobody will actually hear a ring — the UI should say
      // "not reachable" rather than spinning for 45s.
      deliverable: reachable.length > 0,
      callees: evaluations.map((e) => ({
        id: e.id,
        name: e.name,
        reachable: e.notificationsAllowed && e.hasVoipDevice,
      })),
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
