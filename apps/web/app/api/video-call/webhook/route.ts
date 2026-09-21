// app/api/video-call/webhook/route.ts
//
// LiveKit webhook receiver — the source of truth for the call log.
//
// Clients cannot be trusted to report the end of a call: a crash, a force-quit
// or a dead battery means the "I hung up" request never arrives, leaving the
// row stuck in `active` forever. LiveKit emits these events server-side, signed
// with the API secret.
//
// Public route by necessity (LiveKit is not a logged-in user), but every
// request is authenticated by WebhookReceiver verifying the signature against
// the Authorization header. An unsigned or mis-signed payload is rejected.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import { isPatientIdentity } from "@fajr/shared/video-call";
import { getLiveKitConfig } from "@/lib/server/videoCall";

export async function POST(request: NextRequest) {
  let event;

  try {
    const config = getLiveKitConfig();
    const receiver = new WebhookReceiver(config.apiKey, config.apiSecret);

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unsigned" }, { status: 401 });
    }

    // Must be the raw body — any reserialization breaks the signature hash.
    const body = await request.text();
    event = await receiver.receive(body, authHeader);
  } catch (error) {
    console.error("[video-call/webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const roomName = event.room?.name;
    if (!roomName) {
      // Ingress/egress events we don't care about. 200 so LiveKit stops retrying.
      return NextResponse.json({ ok: true });
    }

    const callSession = await db.query.videoCallSessions.findFirst({
      where: eq(videoCallSessions.roomName, roomName),
    });

    if (!callSession) {
      console.warn(`[video-call/webhook] unknown room: ${roomName}`);
      return NextResponse.json({ ok: true });
    }

    const now = new Date();

    switch (event.event) {
      case "participant_joined": {
        const identity = event.participant?.identity ?? "";
        const updates: Partial<typeof videoCallSessions.$inferInsert> = {
          status: "active",
          updatedAt: now,
        };

        // First join starts the clock. Duration is measured from here rather
        // than from room_finished's own duration, which is padded by
        // room.empty_timeout (30s) — see apps/livekit-server/config.yaml.
        if (!callSession.startedAt) updates.startedAt = now;

        // Patient identities are prefixed at mint time, so we can distinguish
        // sides without a lookup. A call that ends with this still null is a
        // no-show, which is the clinically interesting case.
        if (isPatientIdentity(identity) && !callSession.patientJoinedAt) {
          updates.patientJoinedAt = now;
        }

        await db
          .update(videoCallSessions)
          .set(updates)
          .where(eq(videoCallSessions.id, callSession.id));
        break;
      }

      case "participant_left": {
        // Track the most recent departure so room_finished can use it as the
        // end time instead of its own delayed timestamp.
        await db
          .update(videoCallSessions)
          .set({ endedAt: now, updatedAt: now })
          .where(eq(videoCallSessions.id, callSession.id));
        break;
      }

      case "room_finished": {
        const endedAt = callSession.endedAt ?? now;
        const startedAt = callSession.startedAt;

        const durationSeconds = startedAt
          ? Math.max(
              0,
              Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
            )
          : 0;

        await db
          .update(videoCallSessions)
          .set({
            endedAt,
            durationSeconds,
            status: callSession.patientJoinedAt ? "completed" : "missed",
            endedReason: callSession.patientJoinedAt
              ? "room_finished"
              : "patient_no_show",
            // The room is gone; the link should not resurrect it.
            isRevoked: true,
            updatedAt: now,
          })
          .where(eq(videoCallSessions.id, callSession.id));
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Signature was valid but processing failed. Return 500 so LiveKit retries
    // rather than dropping a log entry.
    console.error("[video-call/webhook] processing failed:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
