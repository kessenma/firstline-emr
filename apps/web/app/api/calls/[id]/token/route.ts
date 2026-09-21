// app/api/calls/[id]/token/route.ts
// Re-issue a scoped LiveKit token for a call the requester is a participant of.
// The happy path gets its token inline from /api/calls and /accept; this route
// exists for reconnects after an app restart or a dropped connection.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  getCallForParticipant,
  livekitServerUrl,
  mintStaffCallToken,
} from "@/lib/calls";

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
    // This lookup is the authorization check: no participant row, no token.
    const row = await getCallForParticipant(callId, session.userId);
    if (!row) {
      return NextResponse.json(
        { error: "Not a participant of this call" },
        { status: 403 },
      );
    }

    const { call } = row;

    if (!["ringing", "active"].includes(call.status)) {
      return NextResponse.json(
        { error: `Call is ${call.status}` },
        { status: 409 },
      );
    }

    const token = await mintStaffCallToken({
      roomName: call.roomName,
      userId: session.userId,
      displayName:
        `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() ||
        session.email ||
        "Staff",
      kind: call.kind,
    });

    return NextResponse.json({
      token,
      url: livekitServerUrl(),
      roomName: call.roomName,
    });
  } catch (error) {
    console.error("Error minting call token:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
