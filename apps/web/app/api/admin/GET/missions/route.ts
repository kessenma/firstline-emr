export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { users } from "@/db/schema/users";
import { desc, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Fetch all missions ordered by created_at desc
    const allMissions = await db
      .select()
      .from(missions)
      .orderBy(desc(missions.createdAt));

    // For each mission, count members (users whose missions array contains the mission ID)
    const missionsWithCounts = await Promise.all(
      allMissions.map(async (mission) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(sql`${users.missions} @> ARRAY[${mission.id}]`);

        return {
          ...mission,
          memberCount: count,
        };
      }),
    );

    return NextResponse.json({ missions: missionsWithCounts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching missions:", error);
    return NextResponse.json(
      { message: "Failed to fetch missions" },
      { status: 500 },
    );
  }
}
