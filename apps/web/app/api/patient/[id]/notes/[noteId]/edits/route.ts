// app/api/patient/[id]/notes/[noteId]/edits/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { noteEdits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await params;

    if (!UUID_REGEX.test(noteId)) {
      return NextResponse.json(
        { error: "Invalid note ID format" },
        { status: 400 },
      );
    }

    const edits = await db
      .select()
      .from(noteEdits)
      .where(eq(noteEdits.noteId, noteId))
      .orderBy(desc(noteEdits.createdAt));

    return NextResponse.json(edits, { status: 200 });
  } catch (error) {
    console.error("[Error] Failed to fetch note edits:", error);
    return NextResponse.json(
      { error: `Failed to fetch note edits: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
