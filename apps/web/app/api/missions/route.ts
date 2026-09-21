export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { desc } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const allMissions = await db
      .select({
        id: missions.id,
        name: missions.name,
        status: missions.status,
        country: missions.country,
        city: missions.city,
        hospitals: missions.hospitals,
        defaultIntakeHospital: missions.defaultIntakeHospital,
        description: missions.description,
        startDate: missions.startDate,
        endDate: missions.endDate,
        urls: missions.urls,
        isActiveIntake: missions.isActiveIntake,
      })
      .from(missions)
      .orderBy(desc(missions.createdAt));

    return NextResponse.json({ missions: allMissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching missions:", error);
    return NextResponse.json(
      { message: "Failed to fetch missions" },
      { status: 500 },
    );
  }
}
