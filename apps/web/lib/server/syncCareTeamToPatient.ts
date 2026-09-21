// lib/server/syncCareTeamToPatient.ts
// Single helper to sync patient_care_team → patients.careTeam JSON array.
// Replaces all scattered dual-write logic across API routes.

import { db } from "@/db";
import { patientCareTeam, patients } from "@/db/schema";
import { users } from "@/db/schema/users";
import { eq, and, isNull } from "drizzle-orm";
import type { CareTeamMemberJSON } from "@fajr/shared/care-team";

export async function syncCareTeamToPatient(
  patientId: string,
): Promise<CareTeamMemberJSON[]> {
  // 1. Read all active members from patient_care_team JOIN users
  const activeMembers = await db
    .select({
      userId: patientCareTeam.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: patientCareTeam.role,
      isLead: patientCareTeam.isLead,
    })
    .from(patientCareTeam)
    .innerJoin(users, eq(patientCareTeam.userId, users.id))
    .where(
      and(
        eq(patientCareTeam.patientId, patientId),
        isNull(patientCareTeam.removedAt),
      ),
    );

  // 2. Build the JSON array
  const careTeamArray: CareTeamMemberJSON[] = activeMembers.map((m) => ({
    userId: m.userId,
    firstName: m.firstName || "",
    lastName: m.lastName || "",
    email: m.email || "",
    role: m.role,
    isLead: m.isLead,
  }));

  // 3. Write to patients.careTeam
  await db
    .update(patients)
    .set({
      careTeam: careTeamArray,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, patientId));

  return careTeamArray;
}
