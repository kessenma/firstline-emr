// app/api/calls/[id]/decline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { calls, callParticipants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { countRingingCallees, getCallForParticipant } from "@/lib/calls";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: callId } = await props.params;

  try {
    const row = await getCallForParticipant(callId, session.userId);
    if (!row) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const { call, participant } = row;

    // Idempotent — a duplicate decline is a no-op, not an error.
    if (participant.status === "declined") {
      return NextResponse.json({ ok: true, status: call.status });
    }

    if (participant.role !== "callee") {
      return NextResponse.json(
        { error: "Only a callee can decline" },
        { status: 400 },
      );
    }

    const now = new Date();

    await db
      .update(callParticipants)
      .set({ status: "declined", leftAt: now, updatedAt: now })
      .where(eq(callParticipants.id, participant.id));

    // If nobody else is still ringing and the call was never answered, the call
    // as a whole is declined.
    const remaining = await countRingingCallees(callId, session.userId);
    let finalStatus = call.status;

    if (remaining === 0 && call.status === "ringing") {
      const [next] = await db
        .update(calls)
        .set({
          status: "declined",
          endedAt: now,
          endReason: "declined",
          updatedAt: now,
        })
        .where(and(eq(calls.id, callId), eq(calls.status, "ringing")))
        .returning();

      finalStatus = next?.status ?? finalStatus;
    }

    return NextResponse.json({ ok: true, status: finalStatus });
  } catch (error) {
    console.error("Error declining call:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
