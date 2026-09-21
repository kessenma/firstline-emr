// apps/web/app/api/messages/mark-read/[threadId]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { markTelegramThreadAsRead } from "@/lib/patient-messages-helpers";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ threadId: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the thread ID from the URL
  const { threadId } = await props.params;

  if (!threadId) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  try {
    const result = await markTelegramThreadAsRead(threadId, session.userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking thread as read:", error);

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
