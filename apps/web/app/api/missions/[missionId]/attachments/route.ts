export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missionAttachments } from "@/db/schema/missionAttachments";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { missionId } = await params;

    const attachments = await db
      .select()
      .from(missionAttachments)
      .where(eq(missionAttachments.missionId, missionId));

    return NextResponse.json({ attachments }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mission attachments:", error);
    return NextResponse.json(
      { message: "Failed to fetch attachments" },
      { status: 500 },
    );
  }
}
