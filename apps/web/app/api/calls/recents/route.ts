// app/api/calls/recents/route.ts
// The requesting user's own call history — backs the Recents tab on both
// platforms. For another user's history (admin view) see /api/calls/user/[userId].
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getCallHistory } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 30);
  const cursor = searchParams.get("cursor");

  try {
    const result = await getCallHistory({
      userId: session.userId,
      limit: Number.isFinite(limit) ? limit : 30,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching call recents:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
