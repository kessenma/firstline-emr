// scripts/backfill-care-team-to-patients.ts
// Run-once script to populate patients.care_team from patient_care_team table
// Usage: npx tsx scripts/backfill-care-team-to-patients.ts

import { db } from "../db";
import { patientCareTeam, patients } from "../db/schema";
import { users } from "../db/schema/users";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { CareTeamMemberJSON } from "../lib/care-team-roles";

async function backfill() {
  console.log("[backfill] Starting care_team backfill...");

  // Step 1: Find all patients that have active care team members
  const patientsWithTeam = await db
    .selectDistinct({ patientId: patientCareTeam.patientId })
    .from(patientCareTeam)
    .where(isNull(patientCareTeam.removedAt));

  console.log(
    `[backfill] Found ${patientsWithTeam.length} patients with active care team records`,
  );

  let updated = 0;
  let errors = 0;

  for (const { patientId } of patientsWithTeam) {
    try {
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

      const careTeamArray: CareTeamMemberJSON[] = activeMembers.map((m) => ({
        userId: m.userId,
        firstName: m.firstName || "",
        lastName: m.lastName || "",
        email: m.email || "",
        role: m.role,
        isLead: m.isLead,
      }));

      await db
        .update(patients)
        .set({
          careTeam: careTeamArray,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patientId));

      updated++;
    } catch (err) {
      console.error(`[backfill] Error for patient ${patientId}:`, err);
      errors++;
    }
  }

  // Step 2: Set empty array for patients with no care team records
  const emptyResult = await db
    .update(patients)
    .set({ careTeam: [] })
    .where(sql`${patients.careTeam} IS NULL`);

  console.log(`[backfill] Done.`);
  console.log(`  Updated from care_team table: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Remaining patients set to empty array`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] Fatal error:", err);
    process.exit(1);
  });
