// apps/web/utils/notifications/specialtyNotification.ts
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  type NewNotification,
} from "@/db/schema/notifications";
import { users } from "@/db/schema/users";
import { sql } from "drizzle-orm";

export async function createSpecialtyNotification({
  message,
  specialty,
  patientId,
  type = "alert",
  senderId = null,
  redirectTo = null,
}: {
  message: string;
  specialty: string;
  patientId?: string;
  type?: "message" | "alert";
  senderId?: string | null;
  redirectTo?: string | null;
}) {
  try {
    // Create the notification
    const [notification] = await db
      .insert(notifications)
      .values({
        sourceId: senderId || undefined,
        message,
        type,
        patientId,
        redirectTo: redirectTo || undefined,
      })
      .returning();

    // Find users with matching specialty. Reads `users` — the single source of
    // truth — so admin-created users (who may have no settings row) are included.
    const targetUsers = await db
      .select({
        userId: users.id,
      })
      .from(users)
      .where(
        sql`${specialty} = ANY(${users.doctorSpecialty})`
      );

    if (targetUsers.length === 0) {
      console.log(`No users found with specialty: ${specialty}`);
      return { notification, userNotifications: [] };
    }

    // Create user notifications
    const userNotificationsData = targetUsers.map((user) => ({
      userId: user.userId,
      notificationId: notification.id,
      read: false,
      methods: ["in-app"],
    }));

    const createdUserNotifications = await db
      .insert(userNotifications)
      .values(userNotificationsData)
      .returning();

    console.log(
      `Created specialty notification for ${targetUsers.length} users with specialty: ${specialty}`
    );

    return { notification, userNotifications: createdUserNotifications };
  } catch (error) {
    console.error("Error creating specialty notification:", error);
    throw error;
  }
}
