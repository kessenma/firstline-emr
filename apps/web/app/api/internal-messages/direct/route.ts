import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getOrCreateDirectThread } from "@/lib/internal-messages-helpers";

export async function POST(req: NextRequest) {
  const session = await verifySessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "participantId is required" },
        { status: 400 },
      );
    }

    if (participantId === session.userId) {
      return NextResponse.json(
        { error: "Cannot start a conversation with yourself" },
        { status: 400 },
      );
    }

    const thread = await getOrCreateDirectThread(session.userId, participantId);

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Error creating direct message thread:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
