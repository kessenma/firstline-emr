// apps/web/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  createNotificationWithRecipients,
} from "@/lib/notification-helpers";
import { pushNotificationService } from "@/lib/pushNotifications";

interface UserSetting {
  userId: string;
}

// Keep track of recent notifications to prevent duplicates
const recentNotifications = new Map<string, number>();
const NOTIFICATION_DEBOUNCE_MS = 5000; // 5 seconds

export async function POST(req: Request) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log the request body for debugging
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const {
      specialty,
      subject,
      message,
      patientCountry,
      patientLanguage,
      patientId,
      userSettings,
    } = requestBody;

    // Validate required fields
    if (!specialty) {
      console.error("Missing specialty in request");
      return NextResponse.json(
        { error: "Specialty is required" },
        { status: 400 },
      );
    }

    if (!message) {
      console.error("Missing message in request");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (!patientId) {
      console.error("Missing patientId in request");
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    if (
      !userSettings ||
      !Array.isArray(userSettings) ||
      userSettings.length === 0
    ) {
      console.error("No valid userSettings provided:", userSettings);
      return NextResponse.json(
        {
          error: "No users to notify",
        },
        { status: 400 },
      );
    }

    // Create a unique key for this notification batch
    const notificationKey = `${patientId}-${specialty}-${session.userId}`;
    const now = Date.now();

    // Check if we've recently processed this exact notification
    if (recentNotifications.has(notificationKey)) {
      const lastTime = recentNotifications.get(notificationKey)!;
      if (now - lastTime < NOTIFICATION_DEBOUNCE_MS) {
        console.log(
          `Skipping duplicate notification batch: ${notificationKey} (sent ${now - lastTime}ms ago)`,
        );
        return NextResponse.json({
          success: true,
          totalCount: 0,
          emailCount: 0,
          skipped: true,
        });
      }
    }

    // Update the timestamp for this notification
    recentNotifications.set(notificationKey, now);

    // Clean up old entries from the map
    for (const [key, timestamp] of recentNotifications.entries()) {
      if (now - timestamp > NOTIFICATION_DEBOUNCE_MS * 2) {
        recentNotifications.delete(key);
      }
    }

    console.log(
      `Creating notifications for ${userSettings.length} users for specialty: ${specialty}`,
    );

    try {
      // Deduplicate user IDs
      const uniqueUserIds = Array.from(
        new Set(
          userSettings
            .map((user: UserSetting) => user.userId)
            .filter((id: string) => id),
        ),
      );

      console.log(`After deduplication: ${uniqueUserIds.length} unique users`);

      // Create the notification with all recipients
      const fullMessage = `${message} Patient from ${patientCountry || "Unknown"} speaking ${patientLanguage || "Unknown"}.`;

      const result = await createNotificationWithRecipients(
        {
          sourceId: session.userId,
          message: fullMessage,
          type: "alert",
          subject: subject || `New Case for ${specialty}`,
          patientId: patientId,
          redirectTo: patientId ? `/patient/${patientId}` : undefined,
        },
        uniqueUserIds,
        [],
      );

      console.log(
        `Created central notification with ID: ${result.notification.id}`,
      );
      console.log(
        `Notified ${result.totalCount} users`,
      );

      // Send push notifications to all recipients
      try {
        await pushNotificationService.sendNotificationToUsers(uniqueUserIds, {
          title: subject || "New Notification",
          body: fullMessage,
          data: {
            type: "notification",
            notificationId: result.notification.id,
            patientId: patientId,
          },
          sound: "default",
          badge: 1,
        });
        console.log(
          `📱 Sent push notifications to ${uniqueUserIds.length} users`,
        );
      } catch (pushError) {
        console.error("❌ Failed to send push notifications:", pushError);
        // Don't fail the request if push notifications fail
      }

      return NextResponse.json({
        success: true,
        totalCount: result.totalCount,
        emailCount: 0,
        notificationId: result.notification.id,
      });
    } catch (dbError) {
      console.error("Database error creating notifications:", dbError);
      return NextResponse.json(
        {
          error: "Database error creating notifications",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error creating notifications:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
