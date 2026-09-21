// app/api/admin/GET/central-notifications/route.ts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  notifications,
  userNotifications,
  notificationRecipients,
} from "@/db/schema";
import { and, eq, ilike, inArray, desc, count, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      console.log("Unauthorized access attempted");
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "15");
    const patientId = searchParams.get("patientId");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const notificationType = searchParams.get("notificationType");
    const specialty = searchParams.get("specialty");

    // Build where conditions
    const conditions = [];

    // Filter by patient ID
    if (patientId) {
      conditions.push(eq(notifications.patientId, patientId));
    }

    // Filter by type
    if (type && type !== "all") {
      conditions.push(eq(notifications.type, type as "message" | "alert"));
    }

    // Filter by notification type using message pattern matching
    if (notificationType === "new_patient") {
      conditions.push(
        ilike(notifications.message, "%completed their intake form%"),
      );
    } else if (notificationType === "specialty_assigned") {
      conditions.push(
        ilike(
          notifications.message,
          "%New case requires attention for your specialty%",
        ),
      );
    }

    // Filter by specialty using message pattern matching
    if (specialty && specialty !== "All Specialties") {
      conditions.push(
        ilike(notifications.message, `%specialty: ${specialty}%`),
      );
    }

    // Filter by user ID - get notification IDs where user is a recipient
    let filteredNotificationIds: string[] = [];
    if (userId) {
      // Find notifications where user is in userNotifications
      const userNotifs = await db
        .select({ notificationId: userNotifications.notificationId })
        .from(userNotifications)
        .where(eq(userNotifications.userId, userId));

      // Find notifications where user is in recipients
      const recipientNotifs = await db
        .select({ notificationId: notificationRecipients.notificationId })
        .from(notificationRecipients)
        .where(eq(notificationRecipients.userId, userId));

      // Combine both sets of notification IDs
      filteredNotificationIds = [
        ...new Set([
          ...userNotifs.map((n) => n.notificationId),
          ...recipientNotifs.map((n) => n.notificationId),
        ]),
      ];

      if (filteredNotificationIds.length === 0) {
        // No notifications found for this user
        return NextResponse.json({
          notifications: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
        });
      }

      conditions.push(inArray(notifications.id, filteredNotificationIds));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get total count
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(notifications)
      .where(whereClause);

    const totalPages = Math.ceil(totalCount / limit);

    // Fetch notifications with pagination
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get notification IDs for fetching counts
    const notificationIds = notificationsList.map((n) => n.id);

    if (notificationIds.length === 0) {
      return NextResponse.json({
        notifications: [],
        totalCount,
        totalPages,
        currentPage: page,
      });
    }

    // Get recipient and read counts for each notification using aggregation
    const countsQuery = await db
      .select({
        notificationId: userNotifications.notificationId,
        recipientCount: count(),
        readCount: sql<number>`SUM(CASE WHEN ${userNotifications.read} = true THEN 1 ELSE 0 END)`,
      })
      .from(userNotifications)
      .where(inArray(userNotifications.notificationId, notificationIds))
      .groupBy(userNotifications.notificationId);

    // Create a map of notification ID to counts
    const countsMap = countsQuery.reduce(
      (map, item) => {
        map[item.notificationId] = {
          recipientCount: item.recipientCount,
          readCount: Number(item.readCount) || 0,
        };
        return map;
      },
      {} as Record<string, { recipientCount: number; readCount: number }>,
    );

    // Get recipient counts from notificationRecipients table as well
    const recipientCounts = await db
      .select({
        notificationId: notificationRecipients.notificationId,
        recipientCount: count(),
      })
      .from(notificationRecipients)
      .where(inArray(notificationRecipients.notificationId, notificationIds))
      .groupBy(notificationRecipients.notificationId);

    const recipientCountsMap = recipientCounts.reduce(
      (map, item) => {
        map[item.notificationId] = item.recipientCount;
        return map;
      },
      {} as Record<string, number>,
    );

    // Enhance notifications with counts
    const enhancedNotifications = notificationsList.map((notification) => {
      const id = notification.id;
      const counts = countsMap[id] || { recipientCount: 0, readCount: 0 };
      const recipientCount = recipientCountsMap[id] || 0;

      return {
        ...notification,
        recipientCount: Math.max(counts.recipientCount, recipientCount),
        readCount: counts.readCount,
      };
    });

    return NextResponse.json({
      notifications: enhancedNotifications,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching central notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
