import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { leaveThread } from "@/lib/internal-messages-helpers";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  try {
    const result = await leaveThread(id, session.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error leaving thread:", error);

    if (error.message === "Thread not found") {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (error.message === "Cannot leave system groups") {
      return NextResponse.json(
        { error: "Cannot leave system groups" },
        { status: 403 },
      );
    }
    if (error.message === "Not an active participant in this thread") {
      return NextResponse.json(
        { error: "Not a participant" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
