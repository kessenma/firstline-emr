export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { sql } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get("missionId");

    if (!missionId) {
      return NextResponse.json(
        { message: "Mission ID is required" },
        { status: 400 },
      );
    }

    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
        doctorSpecialty: users.doctorSpecialty,
      })
      .from(users)
      .where(sql`${users.missions} @> ARRAY[${missionId}]`);

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mission members:", error);
    return NextResponse.json(
      { message: "Failed to fetch mission members" },
      { status: 500 },
    );
  }
}
