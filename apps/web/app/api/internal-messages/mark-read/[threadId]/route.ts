import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { markInternalThreadAsRead } from "@/lib/internal-messages-helpers";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ threadId: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await props.params;
  if (!threadId) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  try {
    const result = await markInternalThreadAsRead(threadId, session.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error marking internal thread read:", error);

    if (error.message === "Thread not found") {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (error.message === "Unauthorized: Not a participant in this thread") {
      return NextResponse.json(
        { error: "Unauthorized: Not a participant in this thread" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
