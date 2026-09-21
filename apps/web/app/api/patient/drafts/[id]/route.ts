export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patientDrafts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fetch a single draft by ID (for resuming in the form)
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Valid draft ID is required" },
        { status: 400 },
      );
    }

    const draft = await db
      .select()
      .from(patientDrafts)
      .where(
        and(
          eq(patientDrafts.id, id),
          eq(patientDrafts.createdById, session.userId),
        ),
      )
      .limit(1);

    if (draft.length === 0) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: draft[0] }, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Failed to fetch draft:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch draft: ${error.message}` },
      { status: 500 },
    );
  }
}
