// fajr-medflow-emr/apps/web/lib/pushNotifications.ts
import axios from "axios";

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

interface DeviceTokens {
  ios?: string[] | null;
  android?: string[] | null;
}

class PushNotificationService {
  private notificationsServerUrl: string;

  constructor(
    notificationsServerUrl: string = process.env.NOTIFICATIONS_SERVER_URL ||
      process.env.NEXT_PUBLIC_NOTIFICATIONS_SERVER_URL ||
      "http://notifications-server:8080",
  ) {
    this.notificationsServerUrl = notificationsServerUrl;
  }

  /**
   * Send push notification to a single user by user ID
   * Uses notifications server which handles device token lookup and gorush communication
   */
  async sendNotificationToUser(
    userId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      console.log(
        `📤 Sending push notification to user ${userId}:`,
        notification.title,
      );

      const response = await axios.post(
        `${this.notificationsServerUrl}/api/push/send`,
        {
          user_id: userId,
          title: notification.title,
          message: notification.body,
          data: notification.data || {},
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("✅ Push notification sent:", response.data);
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error);
      // Don't throw - push notification failure shouldn't break the main flow
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      console.log(
        `📤 Sending push notifications to ${userIds.length} users:`,
        notification.title,
      );

      // Create individual notifications for each user
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title: notification.title,
        message: notification.body,
        data: notification.data || {},
      }));

      const response = await axios.post(
        `${this.notificationsServerUrl}/api/push/send-batch`,
        notifications,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log(
        `✅ Sent push notifications to ${userIds.length} users`,
        response.data,
      );
    } catch (error) {
      console.error("❌ Failed to send notifications to users:", error);
      // Don't throw - push notification failure shouldn't break the main flow
    }
  }

  /**
   * Send notification directly to device tokens
   * This is a low-level method - prefer sendNotificationToUser when possible
   */
  async sendNotification(
    tokens: DeviceTokens,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      console.warn(
        "⚠️ Using deprecated sendNotification method. Consider using sendNotificationToUser instead.",
      );

      // This method is deprecated but kept for backwards compatibility
      // It would require direct gorush access which we've moved away from
      console.log(
        "ℹ️ Direct token notification not supported. Use sendNotificationToUser instead.",
      );
    } catch (error) {
      console.error("❌ Failed to send push notification:", error);
    }
  }

  /**
   * Health check for notifications service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.notificationsServerUrl}/health`,
        {
          timeout: 5000,
        },
      );
      return response.status === 200 && response.data?.status === "healthy";
    } catch (error) {
      console.error("❌ Notifications service health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export types
export type { PushNotificationData, DeviceTokens };
