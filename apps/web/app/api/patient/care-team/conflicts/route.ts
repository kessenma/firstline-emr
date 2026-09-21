// app/api/patient/care-team/conflicts/route.ts
// Admin endpoint: list unresolved care team conflicts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { careTeamConflicts, patients, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status =
      request.nextUrl.searchParams.get("status") || "unresolved";

    const conflicts = await db
      .select({
        id: careTeamConflicts.id,
        patientId: careTeamConflicts.patientId,
        conflictingUserIds: careTeamConflicts.conflictingUserIds,
        status: careTeamConflicts.status,
        resolvedBy: careTeamConflicts.resolvedBy,
        resolvedAt: careTeamConflicts.resolvedAt,
        resolutionNotes: careTeamConflicts.resolutionNotes,
        createdAt: careTeamConflicts.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
      })
      .from(careTeamConflicts)
      .leftJoin(patients, eq(careTeamConflicts.patientId, patients.id))
      .where(eq(careTeamConflicts.status, status as "unresolved" | "resolved"))
      .orderBy(sql`${careTeamConflicts.createdAt} DESC`);

    // Enrich with conflicting user names
    const enriched = await Promise.all(
      conflicts.map(async (conflict) => {
        const userIds = conflict.conflictingUserIds.filter(
          (id): id is string => id !== null,
        );
        const conflictingUsers = await Promise.all(
          userIds.map(async (userId) => {
            const [user] = await db
              .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                accountType: users.accountType,
              })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);
            return user || { id: userId, firstName: "Unknown", lastName: "", email: "", accountType: null };
          }),
        );

        return {
          ...conflict,
          conflictingUsers,
        };
      }),
    );

    return NextResponse.json({ conflicts: enriched });
  } catch (error) {
    console.error("[conflicts GET] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
