// lib/notification-helpers.ts
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  notificationRecipients,
  userMessages,
  users,
  admins,
  type Notification,
  type UserNotification,
  type NewNotification,
} from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { notificationService } from "./NotificationService";

/**
 * Create a notification with recipients
 */
export async function createNotificationWithRecipients(
  notificationData: {
    sourceId?: string;
    message: string;
    type?:
      | "message"
      | "alert"
      | "profile_update_approved"
      | "profile_update_denied"
      | "profile_update_request"
      | "patient_update"
      | "system_notification"
      | "new_user_signup"
      // Kept in step with notificationType in db/schema/notifications.ts —
      // this union had drifted and silently excluded two valid values.
      | "specialty_no_doctors"
      | "missed_call";
    subject?: string;
    patientId?: string;
    redirectTo?: string;
  },
  recipientIds: string[],
  emailRecipientIds: string[] = [],
): Promise<{
  notification: Notification;
  totalCount: number;
  emailCount: number;
}> {
  // Create the central notification
  const [notification] = await db
    .insert(notifications)
    .values({
      sourceId: notificationData.sourceId,
      message: notificationData.message,
      type: notificationData.type || "alert",
      subject: notificationData.subject,
      patientId: notificationData.patientId,
      redirectTo: notificationData.redirectTo,
    })
    .returning();

  if (!notification) {
    throw new Error("Failed to create notification");
  }

  // Create notification recipients records
  if (recipientIds.length > 0) {
    const recipientRecords = recipientIds.map((userId) => ({
      notificationId: notification.id,
      userId,
    }));

    await db.insert(notificationRecipients).values(recipientRecords);
  }

  // Create user notification records
  const emailRecipientSet = new Set(emailRecipientIds);
  const userNotificationRecords = recipientIds.map((userId) => ({
    userId,
    notificationId: notification.id,
    read: false,
  }));

  if (userNotificationRecords.length > 0) {
    await db.insert(userNotifications).values(userNotificationRecords);
  }

  // Increment unread counts for all recipients
  for (const userId of recipientIds) {
    await incrementUserNotificationCount(userId);
  }

  return {
    notification,
    totalCount: recipientIds.length,
    emailCount: emailRecipientIds.length,
  };
}

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false,
): Promise<Array<UserNotification & { notification: Notification }>> {
  const whereConditions = unreadOnly
    ? and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.read, false),
      )
    : eq(userNotifications.userId, userId);

  const results = await db
    .select({
      userNotification: userNotifications,
      notification: notifications,
    })
    .from(userNotifications)
    .innerJoin(
      notifications,
      eq(userNotifications.notificationId, notifications.id),
    )
    .where(whereConditions)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return results.map((r) => ({
    ...r.userNotification,
    notification: r.notification,
  }));
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const [userNotif] = await db
    .select()
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.notificationId, notificationId),
        eq(userNotifications.userId, userId),
      ),
    )
    .limit(1);

  if (!userNotif) {
    throw new Error("Notification not found");
  }

  // If already read, no need to update
  if (userNotif.read) {
    return;
  }

  await db
    .update(userNotifications)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(userNotifications.notificationId, notificationId),
        eq(userNotifications.userId, userId),
      ),
    );

  // Decrement unread count
  await decrementUserNotificationCount(userId);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<number> {
  // Get count of unread notifications
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.read, false),
      ),
    );

  const unreadCount = Number(result?.count || 0);

  if (unreadCount === 0) {
    return 0;
  }

  // Mark all as read
  await db
    .update(userNotifications)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.read, false),
      ),
    );

  // Reset unread count to 0
  await db
    .update(userMessages)
    .set({
      unreadCount: 0,
    })
    .where(eq(userMessages.userId, userId));

  return unreadCount;
}

/**
 * Dismiss notification
 */
export async function dismissNotification(
  notificationId: string,
  userId: string,
): Promise<void> {
  await db
    .update(userNotifications)
    .set({
      dismissed: true,
      dismissedAt: new Date(),
    })
    .where(
      and(
        eq(userNotifications.notificationId, notificationId),
        eq(userNotifications.userId, userId),
      ),
    );
}

/**
 * Get unread notification count for user
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.read, false),
      ),
    );

  return Number(result?.count || 0);
}

/**
 * Increment user's notification unread count
 */
async function incrementUserNotificationCount(userId: string): Promise<void> {
  // Get or create user messages record
  const [existing] = await db
    .select()
    .from(userMessages)
    .where(eq(userMessages.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(userMessages)
      .set({
        unreadCount: (existing.unreadCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(userMessages.userId, userId));
  } else {
    await db.insert(userMessages).values({
      userId,
      unreadCount: 1,
      lastReadAt: new Date(),
    });
  }
}

/**
 * Decrement user's notification unread count
 */
async function decrementUserNotificationCount(userId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(userMessages)
    .where(eq(userMessages.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(userMessages)
      .set({
        unreadCount: Math.max(0, (existing.unreadCount || 0) - 1),
        updatedAt: new Date(),
      })
      .where(eq(userMessages.userId, userId));
  }
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(
  daysOld: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await db
    .delete(notifications)
    .where(sql`${notifications.createdAt} < ${cutoffDate}`)
    .returning({ id: notifications.id });

  return result.length;
}

/**
 * Get notification by ID with user check
 */
export async function getNotificationById(
  notificationId: string,
  userId: string,
): Promise<(UserNotification & { notification: Notification }) | null> {
  const [result] = await db
    .select({
      userNotification: userNotifications,
      notification: notifications,
    })
    .from(userNotifications)
    .innerJoin(
      notifications,
      eq(userNotifications.notificationId, notifications.id),
    )
    .where(
      and(
        eq(userNotifications.notificationId, notificationId),
        eq(userNotifications.userId, userId),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    ...result.userNotification,
    notification: result.notification,
  };
}

/**
 * Notify all admins of a new user signup
 * Now uses NotificationService to also send push notifications
 */
export async function notifyAdminsOfNewSignup(newUserData: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
}): Promise<{ notification: Notification; totalCount: number }> {
  // Create notification message
  const message = `New ${newUserData.accountType} signup: ${newUserData.firstName} ${newUserData.lastName} (${newUserData.email})`;

  // Use unified notification service (handles in-app + push notifications)
  const result = await notificationService.sendToAdmins({
    type: "new_user_signup",
    message,
    title: "New User Signup",
    subject: `New ${newUserData.accountType} User Registration`,
    sourceId: newUserData.userId,
    redirectTo: `/admin/new-signups`,
  });

  console.log(
    `✉️ Notified ${result.totalCount} admins about new user signup: ${newUserData.email} (${result.pushSentCount} push)`,
  );

  return {
    notification: result.notification,
    totalCount: result.totalCount,
  };
}
