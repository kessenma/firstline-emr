// apps/web/app/api/notifications/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { users, adminNotifications } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { pushNotificationService } from "@/lib/pushNotifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { message, type, notifyDoctors, notifyTriage, senderId, actionUrl, description, links, images } =
      await req.json();

    if (!message || (!notifyDoctors && !notifyTriage)) {
      return NextResponse.json(
        { error: "Invalid request parameters." },
        { status: 400 },
      );
    }

    // Build user query conditions
    const accountTypeConditions: ("Doctor" | "Triage")[] = [];
    if (notifyDoctors) accountTypeConditions.push("Doctor");
    if (notifyTriage) accountTypeConditions.push("Triage");

    const targetUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
      })
      .from(users)
      .where(inArray(users.accountType, accountTypeConditions));

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { message: "No users found for the selected roles." },
        { status: 200 },
      );
    }

    // Save notification to DB
    const savedNotification = await db
      .insert(adminNotifications)
      .values({
        senderId: senderId || session.userId,
        message,
        type: type || "announcement",
        emailSent: false,
        actionUrl: actionUrl || null,
        description: description || null,
        links: links || null,
        images: images || null,
      })
      .returning();

    // Send push notifications
    const userIds = targetUsers.map((u) => u.id);
    try {
      await pushNotificationService.sendNotificationToUsers(userIds, {
        title: `${(type || "announcement").charAt(0).toUpperCase() + (type || "announcement").slice(1)} Notification`,
        body: message,
        data: { type: "admin_notification", notificationId: savedNotification[0].id },
      });
      console.log(`Sent admin push notifications to ${userIds.length} users`);
    } catch (pushError) {
      console.error("Failed to send push notifications:", pushError);
    }

    return NextResponse.json(
      {
        message: "Notification sent successfully.",
        notification: savedNotification[0],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
