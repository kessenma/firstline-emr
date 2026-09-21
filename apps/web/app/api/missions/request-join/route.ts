export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { missionRequests } from "@/db/schema/missionRequests";
import { users } from "@/db/schema/users";
import { eq, and, inArray, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

// GET: Fetch current user's mission requests
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requests = await db
      .select({
        id: missionRequests.id,
        missionId: missionRequests.missionId,
        status: missionRequests.status,
        reviewNotes: missionRequests.reviewNotes,
        createdAt: missionRequests.createdAt,
        missionName: missions.name,
        missionCountry: missions.country,
      })
      .from(missionRequests)
      .innerJoin(missions, eq(missionRequests.missionId, missions.id))
      .where(eq(missionRequests.userId, session.userId));

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mission requests:", error);
    return NextResponse.json(
      { message: "Failed to fetch mission requests" },
      { status: 500 },
    );
  }
}

// POST: Create mission join requests
export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { missionIds } = await request.json();

    if (!missionIds || !Array.isArray(missionIds) || missionIds.length === 0) {
      return NextResponse.json(
        { message: "missionIds array is required" },
        { status: 400 },
      );
    }

    // Fetch the missions to validate they exist and are planned/active
    const validMissions = await db
      .select({ id: missions.id })
      .from(missions)
      .where(
        and(
          inArray(missions.id, missionIds),
          inArray(missions.status, ["planned", "active"]),
        ),
      );

    const validMissionIds = validMissions.map((m) => m.id);
    if (validMissionIds.length === 0) {
      return NextResponse.json(
        { message: "No valid planned or active missions found" },
        { status: 400 },
      );
    }

    // Check which missions the user is already a member of
    const user = await db
      .select({ missions: users.missions })
      .from(users)
      .where(eq(users.id, session.userId))
      .then((rows) => rows[0]);

    const currentMissions = user?.missions || [];
    const notAlreadyMember = validMissionIds.filter(
      (id) => !currentMissions.includes(id),
    );

    if (notAlreadyMember.length === 0) {
      return NextResponse.json(
        { message: "You are already a member of all requested missions" },
        { status: 400 },
      );
    }

    // Check for existing pending requests
    const existingPending = await db
      .select({ missionId: missionRequests.missionId })
      .from(missionRequests)
      .where(
        and(
          eq(missionRequests.userId, session.userId),
          eq(missionRequests.status, "pending"),
          inArray(missionRequests.missionId, notAlreadyMember),
        ),
      );

    const alreadyPending = new Set(existingPending.map((r) => r.missionId));
    const toCreate = notAlreadyMember.filter((id) => !alreadyPending.has(id));

    if (toCreate.length === 0) {
      return NextResponse.json(
        { message: "You already have pending requests for all selected missions" },
        { status: 400 },
      );
    }

    // Insert new requests
    const inserted = await db
      .insert(missionRequests)
      .values(
        toCreate.map((missionId) => ({
          userId: session.userId,
          missionId,
          status: "pending" as const,
        })),
      )
      .returning({ id: missionRequests.id });

    return NextResponse.json(
      {
        message: `${inserted.length} request(s) submitted`,
        requestIds: inserted.map((r) => r.id),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating mission requests:", error);
    return NextResponse.json(
      { message: "Failed to create mission requests" },
      { status: 500 },
    );
  }
}
