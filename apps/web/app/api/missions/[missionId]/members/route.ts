export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { sql, eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { missionId } = await params;

    if (!missionId) {
      return NextResponse.json(
        { message: "Mission ID is required" },
        { status: 400 },
      );
    }

    // Verify the requesting user is a member of this mission
    const currentUser = await db
      .select({ missions: users.missions })
      .from(users)
      .where(eq(users.id, session.userId))
      .then((rows) => rows[0]);

    const userMissions = currentUser?.missions || [];
    if (!userMissions.includes(missionId) && !session.isAdmin) {
      return NextResponse.json(
        { message: "You are not a member of this mission" },
        { status: 403 },
      );
    }

    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        image: users.image,
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
