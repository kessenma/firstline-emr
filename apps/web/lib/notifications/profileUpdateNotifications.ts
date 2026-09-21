// lib/notifications/profileUpdateNotifications.ts
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  notificationRecipients,
  admins,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getFieldDisplayName,
  formatFieldValue,
} from "@/lib/profileUpdateHelpers";

interface CreateProfileUpdateRequestNotificationParams {
  userId: string;
  userEmail: string;
  userName: string;
  fieldName: string;
  requestedValue: any;
  requestId: string;
}

interface CreateProfileUpdateResponseNotificationParams {
  userId: string;
  fieldName: string;
  requestedValue: any;
  status: "approved" | "denied";
  reviewedByName: string;
  reviewNotes?: string;
  requestId: string;
}

/**
 * Create notification for admins when a user requests a profile update
 */
export async function notifyAdminsOfProfileUpdateRequest(
  params: CreateProfileUpdateRequestNotificationParams,
): Promise<void> {
  const { userId, userEmail, userName, fieldName, requestedValue, requestId } =
    params;

  try {
    // Get all admin user IDs
    const adminRecords = await db.query.admins.findMany({
      columns: { userId: true },
    });

    if (adminRecords.length === 0) {
      console.warn("No admins found to notify about profile update request");
      return;
    }

    const adminUserIds = adminRecords.map((admin) => admin.userId);

    // Format the field name and value for display
    const fieldDisplayName = getFieldDisplayName(fieldName);
    const formattedValue = formatFieldValue(requestedValue);

    // Create the notification
    const [notification] = await db
      .insert(notifications)
      .values({
        message: `${userName} (${userEmail}) has requested to update their ${fieldDisplayName} to: ${formattedValue}`,
        type: "profile_update_request",
        subject: `Profile Update Request - ${fieldDisplayName}`,
        sourceId: userId,
        redirectTo: `/admin-dashboard?section=profileUpdateRequests&requestId=${requestId}`,
      })
      .returning();

    // Create user notifications for each admin
    const userNotificationPromises = adminUserIds.map(async (adminUserId) => {
      // Get admin's email for potential email notifications
      const adminUser = await db.query.users.findFirst({
        where: eq(users.id, adminUserId),
        columns: { email: true },
      });

      return db.insert(userNotifications).values({
        userId: adminUserId,
        notificationId: notification.id,
        read: false,
      });
    });

    await Promise.all(userNotificationPromises);

    // Create notification recipients records
    const recipientPromises = adminUserIds.map((adminUserId) =>
      db.insert(notificationRecipients).values({
        notificationId: notification.id,
        userId: adminUserId,
      }),
    );

    await Promise.all(recipientPromises);

    console.log(
      `Created profile update request notification for ${adminUserIds.length} admins`,
    );
  } catch (error) {
    console.error(
      "Error creating admin notification for profile update request:",
      error,
    );
    throw error;
  }
}

/**
 * Create notification for user when their profile update request is approved/denied
 */
export async function notifyUserOfProfileUpdateResponse(
  params: CreateProfileUpdateResponseNotificationParams,
): Promise<void> {
  const {
    userId,
    fieldName,
    requestedValue,
    status,
    reviewedByName,
    reviewNotes,
    requestId,
  } = params;

  try {
    // Get user's email
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Format the field name and value for display
    const fieldDisplayName = getFieldDisplayName(fieldName);
    const formattedValue = formatFieldValue(requestedValue);

    // Create different messages based on status
    let message: string;
    let subject: string;
    let notificationType: "profile_update_approved" | "profile_update_denied";

    if (status === "approved") {
      message = `Your request to update your ${fieldDisplayName} to "${formattedValue}" has been approved by ${reviewedByName}.`;
      if (reviewNotes) {
        message += ` Note: ${reviewNotes}`;
      }
      subject = `Profile Update Approved - ${fieldDisplayName}`;
      notificationType = "profile_update_approved";
    } else {
      message = `Your request to update your ${fieldDisplayName} to "${formattedValue}" has been denied by ${reviewedByName}.`;
      if (reviewNotes) {
        message += ` Reason: ${reviewNotes}`;
      }
      subject = `Profile Update Denied - ${fieldDisplayName}`;
      notificationType = "profile_update_denied";
    }

    // Create the notification
    const [notification] = await db
      .insert(notifications)
      .values({
        message,
        type: notificationType,
        subject,
        sourceId: userId,
        redirectTo: `/my-profile`,
      })
      .returning();

    // Create user notification
    await db.insert(userNotifications).values({
      userId: userId,
      notificationId: notification.id,
      read: false,
    });

    // Create notification recipient record
    await db.insert(notificationRecipients).values({
      notificationId: notification.id,
      userId: userId,
    });

    console.log(
      `Created profile update ${status} notification for user ${userId}`,
    );
  } catch (error) {
    console.error(
      `Error creating user notification for profile update ${status}:`,
      error,
    );
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markProfileUpdateNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  try {
    await db
      .update(userNotifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(
        eq(userNotifications.notificationId, notificationId) &&
          eq(userNotifications.userId, userId),
      );
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Get unread profile update notifications for a user
 */
export async function getUnreadProfileUpdateNotifications(userId: string) {
  try {
    const unreadNotifications = await db.query.userNotifications.findMany({
      where: (userNotifications, { eq, and }) =>
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.read, false),
        ),
      with: {
        notification: true,
      },
      orderBy: (userNotifications, { desc }) => [
        desc(userNotifications.createdAt),
      ],
    });

    return unreadNotifications.filter(
      (un) =>
        un.notification.type === "profile_update_approved" ||
        un.notification.type === "profile_update_denied" ||
        un.notification.type === "profile_update_request",
    );
  } catch (error) {
    console.error("Error fetching unread profile update notifications:", error);
    throw error;
  }
}
