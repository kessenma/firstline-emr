// apps/web/utils/notifications/triageNotification.ts
import { notificationService } from "@/lib/NotificationService";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

/**
 * Creates a triage notification for a patient event and sends it to appropriate staff
 * Now uses NotificationService to also send push notifications
 */
export async function createTriageNotification({
  message,
  patientId,
  patientName,
  eventType = "registration",
  redirectTo = null,
  sourceId = null,
}: {
  message: string;
  patientId: string;
  patientName?: string;
  eventType?: string;
  redirectTo?: string | null;
  sourceId?: string | null;
}): Promise<{
  notification: any;
  userNotifications: any[];
  emailsSent: number;
}> {
  try {
    // Check if there are triage users, if not fall back to doctors
    const triageUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.accountType, "Triage"));

    let accountType: "Triage" | "Doctor" = "Triage";
    if (triageUsers.length === 0) {
      accountType = "Doctor";
    }

    // Use unified notification service (handles in-app + push notifications)
    const result = await notificationService.sendToAccountType({
      type: "alert",
      category: "patient_action",
      message,
      accountType,
      title: "New Patient Registration",
      patientId,
      sourceId: sourceId || undefined,
      redirectTo: redirectTo || `/patient/${patientId}`,
      authorizedOnly: false, // Notify all triage users, not just authorized
    });

    console.log(
      `Created triage notification for patient ${patientId} sent to ${result.totalCount} staff members (${result.pushSentCount} push)`,
    );

    return {
      notification: result.notification,
      userNotifications: [],
      emailsSent: result.pushSentCount, // Repurpose for backward compat
    };
  } catch (error) {
    console.error("Error creating triage notification:", error);
    throw error;
  }
}
