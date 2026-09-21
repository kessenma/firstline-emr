// apps/web/lib/NotificationService.ts
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  notificationRecipients,
  userMessages,
  users,
  userSettings,
  admins,
  type Notification,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { pushNotificationService } from "./pushNotifications";
import { isInQuietHours, type QuietHoursSettings } from "./quietHours";

// Notification types from the schema
export type NotificationType =
  | "message"
  | "alert"
  | "profile_update_approved"
  | "profile_update_denied"
  | "profile_update_request"
  | "patient_update"
  | "system_notification"
  | "new_user_signup"
  | "specialty_no_doctors"
  | "missed_call";

export type AccountType = "Doctor" | "Triage";

export type NotificationCategory =
  | "internal_message"
  | "patient_message"
  | "patient_action"
  // A LIVE staff-to-staff call ringing. Gated by userSettings.notifyCalls and,
  // uniquely, exempt from quiet hours — see getUsersWithPushEnabled.
  | "call"
  // The after-the-fact "you missed a call" notice. Shares the notifyCalls
  // toggle with "call" — someone who turned calls off does not want either —
  // but is NOT exempt from quiet hours: it is informational, and waking a
  // clinician at 3am to tell them they missed a call inverts the intent.
  | "missed_call";

export interface SendNotificationOptions {
  type: NotificationType;
  message: string;
  recipientIds: string[];
  title?: string;
  subject?: string;
  patientId?: string;
  redirectTo?: string;
  sourceId?: string;
  category?: NotificationCategory;
}

export interface NotificationResult {
  notification: Notification;
  totalCount: number;
  pushSentCount: number;
}

export interface SendToAccountTypeOptions {
  type: NotificationType;
  message: string;
  accountType: AccountType;
  title?: string;
  subject?: string;
  patientId?: string;
  redirectTo?: string;
  sourceId?: string;
  authorizedOnly?: boolean;
  category?: NotificationCategory;
}

export interface SendToAdminsOptions {
  type: NotificationType;
  message: string;
  title?: string;
  subject?: string;
  patientId?: string;
  redirectTo?: string;
  sourceId?: string;
  category?: NotificationCategory;
}

export interface SendToSpecialtyOptions {
  type: NotificationType;
  message: string;
  specialty: string;
  title?: string;
  subject?: string;
  patientId?: string;
  redirectTo?: string;
  sourceId?: string;
  category?: NotificationCategory;
}

/**
 * Unified Notification Service
 *
 * This service consolidates all notification creation and push notification sending
 * into a single entry point. It:
 * 1. Creates the in-app notification (DB records)
 * 2. Creates user_notifications records for each recipient
 * 3. Checks userSettings.pushNotificationsEnabled for each recipient
 * 4. Sends push notifications to users who have them enabled
 */
class NotificationService {
  /**
   * Send a notification to specific users
   * This is the core method that all other methods use
   */
  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    const {
      type,
      message,
      recipientIds,
      title,
      subject,
      patientId,
      redirectTo,
      sourceId,
      category,
    } = options;

    if (recipientIds.length === 0) {
      console.log("📭 No recipients for notification, skipping");
      return {
        notification: {} as Notification,
        totalCount: 0,
        pushSentCount: 0,
      };
    }

    // 1. Create the notification record
    const [notification] = await db
      .insert(notifications)
      .values({
        sourceId,
        message,
        type,
        subject,
        patientId,
        redirectTo,
        category,
      })
      .returning();

    if (!notification) {
      throw new Error("Failed to create notification");
    }

    // 2. Create notification recipients records
    const recipientRecords = recipientIds.map((userId) => ({
      notificationId: notification.id,
      userId,
    }));
    await db.insert(notificationRecipients).values(recipientRecords);

    // 3. Create user notification records
    const userNotificationRecords = recipientIds.map((userId) => ({
      userId,
      notificationId: notification.id,
      read: false,
    }));
    await db.insert(userNotifications).values(userNotificationRecords);

    // 4. Increment unread counts for all recipients
    for (const userId of recipientIds) {
      await this.incrementUserNotificationCount(userId);
    }

    // 5. Query which users have push notifications enabled (respects per-category prefs + quiet hours)
    const pushEnabledUsers = await this.getUsersWithPushEnabled(recipientIds, category);

    // 6. Send push notifications to enabled users
    let pushSentCount = 0;
    if (pushEnabledUsers.length > 0) {
      try {
        await pushNotificationService.sendNotificationToUsers(pushEnabledUsers, {
          title: title || this.getDefaultTitle(type),
          body: message,
          data: {
            type,
            notificationId: notification.id,
            patientId,
            redirectTo,
          },
        });
        pushSentCount = pushEnabledUsers.length;
        console.log(
          `📱 Sent push notifications to ${pushSentCount}/${recipientIds.length} users`,
        );
      } catch (error) {
        console.error("❌ Failed to send push notifications:", error);
        // Don't throw - push notification failure shouldn't break the main flow
      }
    } else {
      console.log("📭 No users have push notifications enabled");
    }

    console.log(
      `✉️ Created notification for ${recipientIds.length} users (${pushSentCount} push)`,
    );

    return {
      notification,
      totalCount: recipientIds.length,
      pushSentCount,
    };
  }

  /**
   * Send notification to all users of a specific account type
   */
  async sendToAccountType(
    options: SendToAccountTypeOptions,
  ): Promise<NotificationResult> {
    const { accountType, authorizedOnly = true, ...notificationOptions } = options;

    // Get all users of the specified account type
    let query = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.accountType, accountType));

    const targetUsers = await query;

    // Filter by authorized if needed
    let filteredUsers = targetUsers;
    if (authorizedOnly) {
      const authorizedUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.accountType, accountType), eq(users.authorized, true)));
      filteredUsers = authorizedUsers;
    }

    if (filteredUsers.length === 0) {
      console.log(`📭 No ${accountType} users found to notify`);
      return {
        notification: {} as Notification,
        totalCount: 0,
        pushSentCount: 0,
      };
    }

    const recipientIds = filteredUsers.map((u) => u.id);
    console.log(
      `📤 Sending notification to ${recipientIds.length} ${accountType} users`,
    );

    return this.send({
      ...notificationOptions,
      recipientIds,
    });
  }

  /**
   * Send notification to all admin users
   */
  async sendToAdmins(options: SendToAdminsOptions): Promise<NotificationResult> {
    // Get all admin user IDs
    const adminRecords = await db
      .select({ userId: admins.userId })
      .from(admins);

    const adminUserIds = adminRecords.map((admin) => admin.userId);

    if (adminUserIds.length === 0) {
      console.log("📭 No admins found to notify");
      return {
        notification: {} as Notification,
        totalCount: 0,
        pushSentCount: 0,
      };
    }

    console.log(`📤 Sending notification to ${adminUserIds.length} admins`);

    return this.send({
      ...options,
      recipientIds: adminUserIds,
    });
  }

  /**
   * Send notification to users with a specific specialty
   */
  async sendToSpecialty(
    options: SendToSpecialtyOptions,
  ): Promise<NotificationResult> {
    const { specialty, ...notificationOptions } = options;

    // Get all doctors with the specified specialty
    const doctorUsers = await db
      .select({
        id: users.id,
        doctorSpecialty: users.doctorSpecialty,
      })
      .from(users)
      .where(and(eq(users.accountType, "Doctor"), eq(users.authorized, true)));

    // Filter by specialty (doctorSpecialty is an array)
    const matchingDoctors = doctorUsers.filter((doctor) => {
      const specialties = doctor.doctorSpecialty || [];
      return specialties.includes(specialty);
    });

    if (matchingDoctors.length === 0) {
      console.log(`📭 No doctors found with specialty: ${specialty}`);
      return {
        notification: {} as Notification,
        totalCount: 0,
        pushSentCount: 0,
      };
    }

    const recipientIds = matchingDoctors.map((d) => d.id);
    console.log(
      `📤 Sending notification to ${recipientIds.length} doctors with specialty ${specialty}`,
    );

    return this.send({
      ...notificationOptions,
      recipientIds,
    });
  }

  /**
   * Get users who have push notifications enabled, respecting per-category
   * preferences and quiet hours.
   */
  private async getUsersWithPushEnabled(
    userIds: string[],
    category?: NotificationCategory,
  ): Promise<string[]> {
    if (userIds.length === 0) return [];

    const settings = await db
      .select({
        userId: userSettings.userId,
        pushNotificationsEnabled: userSettings.pushNotificationsEnabled,
        notifyInternalMessages: userSettings.notifyInternalMessages,
        notifyPatientMessages: userSettings.notifyPatientMessages,
        notifyPatientActions: userSettings.notifyPatientActions,
        notifyCalls: userSettings.notifyCalls,
        quietHoursEnabled: userSettings.quietHoursEnabled,
        quietHoursStart: userSettings.quietHoursStart,
        quietHoursEnd: userSettings.quietHoursEnd,
        quietHoursTimezone: userSettings.quietHoursTimezone,
      })
      .from(userSettings)
      .where(inArray(userSettings.userId, userIds));

    const settingsMap = new Map(settings.map((s) => [s.userId, s]));
    const enabledUserIds: string[] = [];

    for (const userId of userIds) {
      const s = settingsMap.get(userId);

      // No settings record → defaults to all enabled, no quiet hours
      if (!s) {
        enabledUserIds.push(userId);
        continue;
      }

      // Master push toggle
      if (s.pushNotificationsEnabled === false) continue;

      // Per-category preference check
      if (category === "internal_message" && s.notifyInternalMessages === false) continue;
      if (category === "patient_message" && s.notifyPatientMessages === false) continue;
      if (category === "patient_action" && s.notifyPatientActions === false) continue;
      if (
        (category === "call" || category === "missed_call") &&
        s.notifyCalls === false
      )
        continue;

      // Quiet hours check.
      // Live calls deliberately bypass quiet hours — a colleague ringing you is
      // urgent by definition, and a silently-dropped clinical call is worse than
      // a 2am ring. The notifyCalls toggle above is the user's explicit opt-out.
      // The caller is warned and must confirm before a quiet-hours call is placed
      // (see app/api/calls/route.ts).
      if (category !== "call" && this.isInQuietHours(s)) continue;

      enabledUserIds.push(userId);
    }

    return enabledUserIds;
  }

  /**
   * Check if the current time falls within the user's quiet hours window.
   * Delegates to lib/quietHours.ts, which the call routes share.
   */
  private isInQuietHours(settings: QuietHoursSettings): boolean {
    return isInQuietHours(settings);
  }

  /**
   * Increment user's notification unread count
   */
  private async incrementUserNotificationCount(userId: string): Promise<void> {
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
   * Get default title based on notification type
   */
  private getDefaultTitle(type: NotificationType): string {
    switch (type) {
      case "new_user_signup":
        return "New User Signup";
      case "specialty_no_doctors":
        return "Specialty Alert";
      case "alert":
        return "New Alert";
      case "message":
        return "New Message";
      case "profile_update_approved":
        return "Profile Approved";
      case "profile_update_denied":
        return "Profile Update Denied";
      case "profile_update_request":
        return "Profile Update Request";
      case "patient_update":
        return "Patient Update";
      case "system_notification":
        return "System Notification";
      case "missed_call":
        return "Missed Call";
      default:
        return "Notification";
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
