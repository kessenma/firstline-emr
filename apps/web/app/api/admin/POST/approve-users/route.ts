// app/api/admin/POST/approve-users/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { userProfileLogs } from "@/db/schema/userProfileLogs";
import { inArray, eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { pushNotificationService } from "@/lib/pushNotifications";

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Parse request body
    const { userIds, missionId } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 },
      );
    }

    // Fetch users to approve (need their details for email)
    const usersToApprove = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        accountType: users.accountType,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    if (usersToApprove.length === 0) {
      return NextResponse.json({ message: "No users found" }, { status: 404 });
    }

    // Update users to approve them
    await db
      .update(users)
      .set({
        authorized: true,
        approvalDate: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds));

    // Assign mission if provided
    if (missionId) {
      for (const user of usersToApprove) {
        const [currentUser] = await db
          .select({ missions: users.missions })
          .from(users)
          .where(eq(users.id, user.id));

        const currentMissions = currentUser?.missions || [];
        const newMissions = currentMissions.includes(missionId)
          ? currentMissions
          : [...currentMissions, missionId];

        await db
          .update(users)
          .set({ missions: newMissions })
          .where(eq(users.id, user.id));

        // Log the mission assignment
        await db.insert(userProfileLogs).values({
          userId: user.id,
          changedBy: session.userId,
          changes: [{
            field: "missions",
            oldValue: currentMissions,
            newValue: newMissions,
          }],
          isAdminAction: true,
        });
      }
      console.log(`Assigned mission ${missionId} to ${usersToApprove.length} users`);
    }

    // Send push notifications to approved users
    // This notifies users in the WaitingRoom that they've been approved
    try {
      await pushNotificationService.sendNotificationToUsers(userIds, {
        title: "Account Approved!",
        body: "Your Fajr EMR account has been approved. You can now access the app.",
        data: { type: "account_approved" },
      });
      console.log(`✅ Sent approval push notifications to ${userIds.length} users`);
    } catch (pushError) {
      // Don't fail the request if push notifications fail
      console.error("Failed to send approval push notifications:", pushError);
    }

    return NextResponse.json(
      { message: "Users approved successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error approving users:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Authorization failed: ${error.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "Unknown error occurred during authorization" },
      { status: 500 },
    );
  }
}
