// lib/telegram-thread-sync.ts
// Syncs care team membership to telegram thread participants.
// Dual-writes to both telegram_threads.participants[] (for web queries)
// and telegram_thread_participants junction table (for PowerSync sync rules).

import { db } from "@/db";
import { telegramThreads, telegramThreadParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Add a user to the telegram thread for a given patient.
 * Updates both the participants[] array and the junction table.
 * No-op if the patient has no telegram thread or user is already a participant.
 */
export async function addUserToPatientTelegramThread(
  patientId: string,
  userId: string,
): Promise<boolean> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.patientId, patientId))
    .limit(1);

  if (!thread) {
    return false; // Patient has no telegram thread yet
  }

  // Update participants[] array if not already present
  const participants = thread.participants || [];
  if (!participants.includes(userId)) {
    await db
      .update(telegramThreads)
      .set({
        participants: [...participants, userId],
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.id, thread.id));
  }

  // Insert into junction table if not already present
  const [existing] = await db
    .select({ id: telegramThreadParticipants.id })
    .from(telegramThreadParticipants)
    .where(
      and(
        eq(telegramThreadParticipants.threadId, thread.id),
        eq(telegramThreadParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(telegramThreadParticipants).values({
      threadId: thread.id,
      userId,
    });
  }

  return true;
}

/**
 * Remove a user from the telegram thread for a given patient.
 * Removes from both the participants[] array and the junction table.
 * No-op if the patient has no telegram thread.
 */
export async function removeUserFromPatientTelegramThread(
  patientId: string,
  userId: string,
): Promise<void> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.patientId, patientId))
    .limit(1);

  if (!thread) {
    return;
  }

  // Remove from participants[] array
  const participants = thread.participants || [];
  if (participants.includes(userId)) {
    await db
      .update(telegramThreads)
      .set({
        participants: participants.filter((id) => id !== userId),
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.id, thread.id));
  }

  // Remove from junction table
  await db
    .delete(telegramThreadParticipants)
    .where(
      and(
        eq(telegramThreadParticipants.threadId, thread.id),
        eq(telegramThreadParticipants.userId, userId),
      ),
    );
}
