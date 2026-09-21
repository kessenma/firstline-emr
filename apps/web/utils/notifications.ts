// apps/web/utils/notifications.ts
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  notificationRecipients,
  type Notification,
  type UserNotification,
  type NewNotification,
  type NewUserNotification,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * Creates a notification and sends it to multiple recipients
 */
export async function createNotificationForMultipleUsers({
  message,
  type = "message",
  recipientIds,
  sourceId = null,
  patientId = null,
  redirectTo = null,
  methods = ["in-app"],
}: {
  message: string;
  type?: "message" | "alert";
  recipientIds: string[];
  sourceId?: string | null;
  patientId?: string | null;
  redirectTo?: string | null;
  methods?: string[];
}): Promise<{
  notification: Notification;
  userNotifications: UserNotification[];
}> {
  if (!message || message.trim() === "") {
    throw new Error("Message cannot be empty");
  }

  if (!recipientIds || recipientIds.length === 0) {
    throw new Error("At least one recipient is required");
  }

  try {
    // Create the central notification
    const [notification] = await db
      .insert(notifications)
      .values({
        sourceId: sourceId || undefined,
        message,
        type,
        patientId: patientId || undefined,
        redirectTo: redirectTo || undefined,
      })
      .returning();

    // Create user-specific notifications
    const userNotificationValues = recipientIds.map((userId) => ({
      userId,
      notificationId: notification.id,
      read: false,
    }));

    const createdUserNotifications = await db
      .insert(userNotifications)
      .values(userNotificationValues)
      .returning();

    // Create notification recipients records
    const recipientValues = recipientIds.map((userId) => ({
      notificationId: notification.id,
      userId,
    }));

    await db.insert(notificationRecipients).values(recipientValues);

    return { notification, userNotifications: createdUserNotifications };
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
  type = "message",
  sourceId = null,
  patientId = null,
  redirectTo = null,
  methods = ["in-app"],
}: {
  userId: string;
  message: string;
  type?: "message" | "alert";
  sourceId?: string | null;
  patientId?: string | null;
  redirectTo?: string | null;
  methods?: string[];
}): Promise<{
  notification: Notification;
  userNotification: UserNotification;
} | null> {
  try {
    const { notification, userNotifications } =
      await createNotificationForMultipleUsers({
        message,
        type,
        recipientIds: [userId],
        sourceId,
        patientId,
        redirectTo,
        methods,
      });

    return { notification, userNotification: userNotifications[0] };
  } catch (error) {
    console.error("Error creating notification for user:", error);
    return null;
  }
}

/**
 * Creates a notification for all users of a specific account type
 */
export async function createNotificationForAccountType({
  message,
  accountType,
  type = "alert",
  sourceId = null,
  patientId = null,
  redirectTo = null,
  methods = ["in-app"],
}: {
  message: string;
  accountType: "Doctor" | "Triage";
  type?: "message" | "alert";
  sourceId?: string | null;
  patientId?: string | null;
  redirectTo?: string | null;
  methods?: string[];
}): Promise<{
  notification: Notification;
  userNotifications: UserNotification[];
} | null> {
  try {
    // Find all users with the specified account type
    const { users: usersTable } = await import("@/db/schema");
    const usersWithAccountType = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.accountType, accountType));

    if (!usersWithAccountType || usersWithAccountType.length === 0) {
      console.log(`No users found with account type: ${accountType}`);
      return null;
    }

    console.log(
      `Creating notifications for ${usersWithAccountType.length} ${accountType} users`,
    );

    // Extract user IDs
    const userIds = usersWithAccountType.map((user: { id: string }) => user.id);

    // Create notifications for all users
    return await createNotificationForMultipleUsers({
      message,
      type,
      recipientIds: userIds,
      sourceId,
      patientId,
      redirectTo,
      methods,
    });
  } catch (error) {
    console.error(
      `Error creating notifications for account type ${accountType}:`,
      error,
    );
    return null;
  }
}

/**
 * Marks a notification as read for a specific user
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  try {
    const result = await db
      .update(userNotifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(userNotifications.notificationId, notificationId),
          eq(userNotifications.userId, userId),
          eq(userNotifications.read, false),
        ),
      )
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Gets notifications for a specific user with pagination
 */
export async function getUserNotifications(
  userId: string,
  skip = 0,
  limit = 20,
): Promise<any[]> {
  try {
    // Find all user notifications for this user, joined with the notification content
    const results = await db
      .select({
        id: userNotifications.id,
        read: userNotifications.read,
        readAt: userNotifications.readAt,
        dismissed: userNotifications.dismissed,
        dismissedAt: userNotifications.dismissedAt,
        createdAt: userNotifications.createdAt,
        notificationId: notifications.id,
        message: notifications.message,
        type: notifications.type,
        patientId: notifications.patientId,
        redirectTo: notifications.redirectTo,
        sourceId: notifications.sourceId,
        notificationCreatedAt: notifications.createdAt,
      })
      .from(userNotifications)
      .innerJoin(
        notifications,
        eq(userNotifications.notificationId, notifications.id),
      )
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit)
      .offset(skip);

    // Transform to the expected format for backward compatibility
    return results.map((result: any) => ({
      _id: result.notificationId, // Use notificationId for marking as read
      id: result.id,
      notificationId: result.notificationId, // Include actual notification ID
      message: result.message,
      type: result.type,
      read: result.read,
      readAt: result.readAt,
      dismissed: result.dismissed,
      dismissedAt: result.dismissedAt,
      createdAt: result.notificationCreatedAt,
      patientId: result.patientId,
      redirectTo: result.redirectTo,
      sourceId: result.sourceId,
    }));
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return [];
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<boolean> {
  try {
    // Update all unread notifications for this user
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

    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  try {
    const results = await db
      .select({ id: userNotifications.id })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.read, false),
          eq(userNotifications.dismissed, false),
        ),
      );

    return results.length;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return 0;
  }
}

/**
 * Dismiss a notification for a specific user
 */
export async function dismissNotification(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  try {
    const result = await db
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
      )
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return false;
  }
}

/**
 * Delete a notification and all associated user notifications
 */
export async function deleteNotification(
  notificationId: string,
): Promise<boolean> {
  try {
    // Delete the notification (cascade will handle user notifications)
    await db.delete(notifications).where(eq(notifications.id, notificationId));

    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}
