// apps/web/utils/notifications/createNotificationForUsers.ts
import { notificationService } from "@/lib/NotificationService";

/**
 * Creates a notification for all users of a specific account type
 * Now uses NotificationService to also send push notifications
 */
export async function createNotificationForAccountType({
  message,
  accountType,
  patientId,
  type = "alert",
  senderId = null,
  redirectTo = "",
  title,
}: {
  message: string;
  accountType: "Doctor" | "Triage";
  patientId?: string;
  type?: "message" | "alert";
  senderId?: string | null;
  redirectTo?: string;
  title?: string;
}): Promise<void> {
  try {
    // Use unified notification service (handles in-app + push notifications)
    const result = await notificationService.sendToAccountType({
      type,
      message,
      accountType,
      title: title || (type === "alert" ? "New Alert" : "New Message"),
      patientId,
      sourceId: senderId || undefined,
      redirectTo: redirectTo || undefined,
      authorizedOnly: false, // Match previous behavior of notifying all users
    });

    console.log(
      `Notifications created for ${result.totalCount} ${accountType} users about patient ${patientId} (${result.pushSentCount} push)`,
    );
  } catch (error) {
    console.error("Error creating notifications:", error);
    throw error;
  }
}

/**
 * Creates a notification for a specific user
 * Now uses NotificationService to also send push notifications
 */
export async function createNotificationForUser({
  userId,
  message,
  patientId,
  type = "message",
  senderId = null,
  redirectTo = "",
  title,
}: {
  userId: string;
  message: string;
  patientId?: string;
  type?: "message" | "alert";
  senderId?: string | null;
  redirectTo?: string;
  title?: string;
}): Promise<any> {
  try {
    // Use unified notification service (handles in-app + push notifications)
    const result = await notificationService.send({
      type,
      message,
      recipientIds: [userId],
      title: title || (type === "alert" ? "New Alert" : "New Message"),
      patientId,
      sourceId: senderId || undefined,
      redirectTo: redirectTo || undefined,
    });

    return result.notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}
