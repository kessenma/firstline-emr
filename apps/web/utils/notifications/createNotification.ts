// apps/web/utils/notifications/createNotification.ts
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  type Notification,
  type NewNotification,
  type UserNotification,
  type NewUserNotification,
} from "@/db/schema/notifications";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

/**
 * Creates a notification for all users of a specific account type
 */
export async function createNotificationForAccountType({
  message,
  accountType,
  patientId,
  type = "alert",
}: {
  message: string;
  accountType: "Doctor" | "Triage";
  patientId?: string;
  type?: "message" | "alert";
}): Promise<void> {
  try {
    // Find all users with the specified account type
    const usersWithAccountType = await db
      .select()
      .from(users)
      .where(eq(users.accountType, accountType));

    if (!usersWithAccountType || usersWithAccountType.length === 0) {
      console.log(`No users found with account type: ${accountType}`);
      return;
    }

    // Create notifications for each user
    for (const user of usersWithAccountType) {
      // Create the notification
      const [notification] = await db
        .insert(notifications)
        .values({
          message,
          type,
          patientId: patientId || null,
        })
        .returning();

      // Create user notification link
      await db.insert(userNotifications).values({
        userId: user.id,
        notificationId: notification.id,
        read: false,
      });

      console.log(
        `Notification created for user ${user.id} about patient ${patientId}`,
      );
    }
  } catch (error) {
    console.error("Error creating notifications:", error);
    throw error;
  }
}

/**
 * Creates a notification for a specific user
 */
export async function createNotificationForUser({
  userId,
  message,
  patientId,
  type = "message",
  redirectTo,
}: {
  userId: string;
  message: string;
  patientId?: string;
  type?: "message" | "alert";
  redirectTo?: string;
}): Promise<Notification | null> {
  try {
    // Create the notification
    const [notification] = await db
      .insert(notifications)
      .values({
        message,
        type,
        patientId: patientId || null,
        ...(redirectTo ? { redirectTo } : {}),
      })
      .returning();

    // Create user notification link
    await db.insert(userNotifications).values({
      userId: userId,
      notificationId: notification.id,
      read: false,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function createNotification(data: NewNotification) {
  const [notification] = await db
    .insert(notifications)
    .values(data)
    .returning();

  return notification;
}

export async function linkUserToNotification(
  userId: string,
  notificationId: string,
) {
  const [userNotification] = await db
    .insert(userNotifications)
    .values({
      userId,
      notificationId,
      read: false,
    })
    .returning();

  return userNotification;
}

export type { Notification, UserNotification };
