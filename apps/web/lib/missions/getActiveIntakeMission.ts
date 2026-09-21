import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { eq } from "drizzle-orm";

/**
 * Get the ID of the currently active intake mission.
 * Only one mission can be active for intake at a time.
 */
export async function getActiveIntakeMissionId(): Promise<string | null> {
  const [mission] = await db
    .select({ id: missions.id })
    .from(missions)
    .where(eq(missions.isActiveIntake, true))
    .limit(1);
  return mission?.id ?? null;
}

/**
 * Get the active intake mission's ID and default hospital (if set).
 */
export async function getActiveIntakeMission(): Promise<{
  id: string;
  defaultIntakeHospital: string | null;
} | null> {
  const [mission] = await db
    .select({
      id: missions.id,
      defaultIntakeHospital: missions.defaultIntakeHospital,
    })
    .from(missions)
    .where(eq(missions.isActiveIntake, true))
    .limit(1);
  return mission ?? null;
}
