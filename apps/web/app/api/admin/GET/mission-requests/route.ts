export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missionRequests } from "@/db/schema/missionRequests";
import { missions } from "@/db/schema/missions";
import { users } from "@/db/schema/users";
import { eq, and, desc } from "drizzle-orm";
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
    const statusFilter = searchParams.get("status");
    const missionIdFilter = searchParams.get("missionId");

    // Build conditions
    const conditions = [];
    if (statusFilter && ["pending", "approved", "denied"].includes(statusFilter)) {
      conditions.push(eq(missionRequests.status, statusFilter as "pending" | "approved" | "denied"));
    }
    if (missionIdFilter) {
      conditions.push(eq(missionRequests.missionId, missionIdFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await db
      .select({
        id: missionRequests.id,
        userId: missionRequests.userId,
        missionId: missionRequests.missionId,
        status: missionRequests.status,
        reviewedBy: missionRequests.reviewedBy,
        reviewedAt: missionRequests.reviewedAt,
        reviewNotes: missionRequests.reviewNotes,
        createdAt: missionRequests.createdAt,
        // User info
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userAccountType: users.accountType,
        // Mission info
        missionName: missions.name,
        missionCountry: missions.country,
      })
      .from(missionRequests)
      .innerJoin(users, eq(missionRequests.userId, users.id))
      .innerJoin(missions, eq(missionRequests.missionId, missions.id))
      .where(whereClause)
      .orderBy(desc(missionRequests.createdAt));

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mission requests:", error);
    return NextResponse.json(
      { message: "Failed to fetch mission requests" },
      { status: 500 },
    );
  }
}
