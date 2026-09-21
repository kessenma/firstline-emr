import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { createGroupThread } from "@/lib/internal-messages-helpers";

export async function POST(req: NextRequest) {
  const session = await verifySessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { participantIds, title } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "participantIds array is required with at least one participant" },
        { status: 400 },
      );
    }

    // Filter out the current user if they included themselves
    const otherParticipants = participantIds.filter(
      (id: string) => id !== session.userId,
    );

    if (otherParticipants.length === 0) {
      return NextResponse.json(
        { error: "At least one other participant is required" },
        { status: 400 },
      );
    }

    const result = await createGroupThread(
      session.userId,
      otherParticipants,
      title,
    );

    return NextResponse.json({
      thread: result.thread,
      existing: result.existing,
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
