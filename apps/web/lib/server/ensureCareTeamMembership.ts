import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { patientCareTeam } from "@/db/schema/patientCareTeam";
import { getAutoEnrolRole, isLeadRole, type CareTeamRole } from "@fajr/shared/care-team";
import { syncCareTeamToPatient } from "@/lib/server/syncCareTeamToPatient";

/**
 * Record that a user is on a patient's care team.
 *
 * `patient_care_team` is the audit trail for who touched a patient's record —
 * rows carry `assignedAt`/`assignedBy` and are soft-deleted via `removedAt`.
 * Triage users are never prompted to join; instead they are enrolled here
 * automatically the first time they edit a patient's specialty, status or
 * priority, so the membership row becomes the record of who triaged them.
 *
 * Idempotent and never a demotion: if the user already has an active row, the
 * existing role is left alone. A surgeon who edits a status must not be
 * silently downgraded to `triage`.
 */
export async function ensureCareTeamMembership(params: {
  patientId: string;
  userId: string;
  role: CareTeamRole;
  assignedBy?: string;
}): Promise<"created" | "reactivated" | "unchanged"> {
  const { patientId, userId, role, assignedBy } = params;

  // Prefer an active row (removedAt IS NULL) over a soft-deleted one.
  const [existing] = await db
    .select()
    .from(patientCareTeam)
    .where(
      and(
        eq(patientCareTeam.patientId, patientId),
        eq(patientCareTeam.userId, userId),
      ),
    )
    .orderBy(sql`${patientCareTeam.removedAt} IS NULL DESC`)
    .limit(1);

  if (existing && existing.removedAt === null) {
    // Already on the team — leave their role as-is.
    return "unchanged";
  }

  if (existing) {
    await db
      .update(patientCareTeam)
      .set({
        role,
        isLead: isLeadRole(role),
        removedAt: null,
        assignedAt: new Date(),
        assignedBy: assignedBy ?? userId,
        updatedAt: new Date(),
      })
      .where(eq(patientCareTeam.id, existing.id));
    await syncCareTeamToPatient(patientId);
    return "reactivated";
  }

  await db.insert(patientCareTeam).values({
    patientId,
    userId,
    role,
    isLead: isLeadRole(role),
    assignedAt: new Date(),
    assignedBy: assignedBy ?? userId,
  });
  await syncCareTeamToPatient(patientId);
  return "created";
}

/**
 * Auto-enrol the editor of a patient, based on their account type.
 *
 * Non-fatal by design: this is an audit side-effect of a mutation that has
 * already been committed, so a failure here must not fail the user's edit.
 * Doctors are intentionally NOT auto-enrolled — they join explicitly through
 * the chart-access prompt, and enrolling them on edit would add them to care
 * teams for patients they never opened, muddying the trail.
 */
export async function recordPatientEditor(params: {
  patientId: string;
  userId: string;
  accountType?: string | null;
}): Promise<void> {
  const role = getAutoEnrolRole(params.accountType);
  if (!role) return;

  try {
    await ensureCareTeamMembership({
      patientId: params.patientId,
      userId: params.userId,
      role,
    });
  } catch (error) {
    console.error(
      `[care-team] Failed to record editor ${params.userId} on patient ${params.patientId}:`,
      error,
    );
  }
}
