// app/api/calls/user/[userId]/route.ts
// One user's call history. Self-service or admin, mirroring the auth rule in
// /api/user-profile-logs/[userId] — backs the "Call History" block in
// UserProfileLogViewer.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getCallHistory, isValidUuid } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> },
) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await props.params;

  if (!isValidUuid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  // Own history, or any history if you're an admin.
  if (session.userId !== userId && !session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const cursor = searchParams.get("cursor");

  try {
    const result = await getCallHistory({
      userId,
      limit: Number.isFinite(limit) ? limit : 20,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching user call history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
