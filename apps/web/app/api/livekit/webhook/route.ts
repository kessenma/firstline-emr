// app/api/livekit/webhook/route.ts
// Authoritative call teardown from the LiveKit SFU.
//
// Without this, a call whose clients both crash stays "active" forever and its
// duration is whatever the client last reported — useless for a clinical audit
// trail. room_finished gives us a server-observed endedAt.
import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/db";
import { calls, callParticipants } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { STAFF_ROOM_PREFIX } from "@/lib/calls";

// WebhookReceiver needs Node crypto, not the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("LiveKit webhook received but API key/secret not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    // Must be the RAW body — req.json() would break signature verification.
    const rawBody = await req.text();
    const authHeader = req.headers.get("authorization");

    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const event = await receiver.receive(rawBody, authHeader ?? undefined);

    const roomName = event.room?.name;
    if (!roomName || !roomName.startsWith(STAFF_ROOM_PREFIX)) {
      // Patient rooms and anything else are not tracked in the calls table.
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (event.event !== "room_finished") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.roomName, roomName))
      .limit(1);

    if (!call) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Only close out calls the clients failed to close themselves.
    if (!["ringing", "active"].includes(call.status)) {
      return NextResponse.json({ ok: true, alreadyClosed: true });
    }

    const now = new Date();
    const answered = call.answeredAt != null;
    const durationSeconds = call.answeredAt
      ? Math.max(
          0,
          Math.round((now.getTime() - call.answeredAt.getTime()) / 1000),
        )
      : null;

    await db.transaction(async (tx) => {
      await tx
        .update(calls)
        .set({
          status: answered ? "completed" : "missed",
          endedAt: now,
          endReason: "room_finished",
          durationSeconds,
          updatedAt: now,
        })
        .where(eq(calls.id, call.id));

      await tx
        .update(callParticipants)
        .set({ status: "left", leftAt: now, updatedAt: now })
        .where(
          and(
            eq(callParticipants.callId, call.id),
            eq(callParticipants.status, "accepted"),
          ),
        );

      await tx
        .update(callParticipants)
        .set({ status: "missed", updatedAt: now })
        .where(
          and(
            eq(callParticipants.callId, call.id),
            inArray(callParticipants.status, ["ringing"]),
          ),
        );
    });

    console.log(
      `📞 LiveKit room_finished closed call ${call.id} as ${answered ? "completed" : "missed"}`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LiveKit webhook error:", error);
    // 401 rather than 500 — a bad signature is the likely cause and LiveKit
    // should not keep retrying a forged request.
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }
}
