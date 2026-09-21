// app/api/auth/signup/missions/route.ts
// Public (pre-auth) list of joinable missions for the signup wizard.
// Deliberately minimal fields — no hospitals/urls/members before login.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/connection";
import { missions } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const joinableMissions = await db
      .select({
        id: missions.id,
        name: missions.name,
        country: missions.country,
        city: missions.city,
        status: missions.status,
        description: missions.description,
      })
      .from(missions)
      .where(inArray(missions.status, ["planned", "active"]))
      .orderBy(desc(missions.createdAt));

    return NextResponse.json({ missions: joinableMissions });
  } catch (error) {
    console.error("❌ Error fetching signup missions:", error);
    return NextResponse.json(
      { message: "Failed to fetch missions" },
      { status: 500 },
    );
  }
}
