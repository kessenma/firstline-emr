// apps/web/lib/server/careTeamRecipients.ts
//
// Who to tell when something happens to a patient.
//
// Reads `patient_care_team`, the source of truth — not `patients.careTeam`,
// which is a denormalised JSON cache refreshed by `syncCareTeamToPatient` and
// can lag a membership change. Notifying from the cache means a doctor who
// joined a minute ago silently misses the event.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { patientCareTeam } from "@/db/schema";

/**
 * Active care team member ids for a patient.
 *
 * `removedAt IS NULL` is the active-membership filter — rows are soft-deleted
 * to keep the audit trail, so omitting it notifies people who were taken off
 * the case.
 */
export async function getCareTeamUserIds(patientId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: patientCareTeam.userId })
    .from(patientCareTeam)
    .where(
      and(
        eq(patientCareTeam.patientId, patientId),
        isNull(patientCareTeam.removedAt),
      ),
    );

  // One person can hold two roles on the same patient, which would otherwise
  // send them the same notification twice.
  return Array.from(new Set(rows.map((r) => r.userId)));
}

/**
 * The team minus whoever performed the action.
 *
 * Self-notification is pure noise: the actor is looking at the confirmation
 * dialog. Pass `null` for an actor with no user row — a patient — and the whole
 * team is notified.
 */
export async function getCareTeamRecipients(
  patientId: string,
  excludeUserId: string | null,
): Promise<string[]> {
  const ids = await getCareTeamUserIds(patientId);
  return excludeUserId ? ids.filter((id) => id !== excludeUserId) : ids;
}
