// app/api/admin/GET/admin-notifications/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminNotifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Fetch latest 10 admin notifications with sender information
    const notifications = await db
      .select({
        id: adminNotifications.id,
        senderId: adminNotifications.senderId,
        message: adminNotifications.message,
        type: adminNotifications.type,
        emailSent: adminNotifications.emailSent,
        createdAt: adminNotifications.createdAt,
        // Sender information from join
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderEmail: users.email,
      })
      .from(adminNotifications)
      .leftJoin(users, eq(adminNotifications.senderId, users.id))
      .orderBy(desc(adminNotifications.createdAt))
      .limit(10);

    // Format the response to match expected structure
    const formattedNotifications = notifications.map((notification) => ({
      id: notification.id,
      senderId: notification.senderId || "System",
      message: notification.message,
      type: notification.type,
      emailSent: notification.emailSent,
      createdAt: notification.createdAt,
      sender: notification.senderId
        ? {
            id: notification.senderId,
            firstName: notification.senderFirstName,
            lastName: notification.senderLastName,
            email: notification.senderEmail,
          }
        : null,
    }));

    return NextResponse.json(formattedNotifications);
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin notifications" },
      { status: 500 },
    );
  }
}
