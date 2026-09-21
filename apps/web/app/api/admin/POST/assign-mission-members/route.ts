export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { missions } from "@/db/schema/missions";
import { userProfileLogs } from "@/db/schema/userProfileLogs";
import { notifications, userNotifications, notificationRecipients } from "@/db/schema/notifications";
import { eq, inArray } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { addParticipantsToThread } from "@/lib/internal-messages-helpers";
import { pushNotificationService } from "@/lib/pushNotifications";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { missionId, userIds, action = "add" } = await request.json();

    if (!missionId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "Mission ID and user IDs are required" },
        { status: 400 },
      );
    }

    // Fetch users to update
    const usersToUpdate = await db
      .select({ id: users.id, missions: users.missions, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(inArray(users.id, userIds));

    if (usersToUpdate.length === 0) {
      return NextResponse.json({ message: "No users found" }, { status: 404 });
    }

    // Users whose membership actually changed (skip no-op adds/removes)
    const newlyAddedUserIds: string[] = [];
    const newlyRemovedUserIds: string[] = [];

    for (const user of usersToUpdate) {
      const currentMissions = user.missions || [];
      let newMissions: string[];

      if (action === "remove") {
        if (currentMissions.includes(missionId)) {
          newlyRemovedUserIds.push(user.id);
        }
        newMissions = currentMissions.filter((id: string) => id !== missionId);
      } else {
        // Add - avoid duplicates
        if (!currentMissions.includes(missionId)) {
          newlyAddedUserIds.push(user.id);
        }
        newMissions = currentMissions.includes(missionId)
          ? currentMissions
          : [...currentMissions, missionId];
      }

      // Update user's missions array
      await db
        .update(users)
        .set({ missions: newMissions, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Log the change in userProfileLogs
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

    // Auto-add new members to mission group chat
    if (action === "add") {
      try {
        const mission = await db
          .select({ groupChatThreadId: missions.groupChatThreadId })
          .from(missions)
          .where(eq(missions.id, missionId))
          .then((rows) => rows[0]);

        if (mission?.groupChatThreadId) {
          await addParticipantsToThread(
            mission.groupChatThreadId,
            userIds,
            session.userId,
          );
        }
      } catch (err) {
        console.error("Failed to add members to mission group chat:", err);
      }
    }

    // Notify affected members — in-app + push, non-blocking
    // (join-request approvals notify separately in review-mission-request)
    const notifyUserIds =
      action === "remove" ? newlyRemovedUserIds : newlyAddedUserIds;
    if (notifyUserIds.length > 0) {
      try {
        const mission = await db
          .select({ name: missions.name, country: missions.country })
          .from(missions)
          .where(eq(missions.id, missionId))
          .then((rows) => rows[0]);

        const missionLabel = mission
          ? `${mission.name} (${mission.country})`
          : "a mission";

        const adminName = [session.firstName, session.lastName]
          .filter(Boolean)
          .join(" ") || "An admin";

        const isRemove = action === "remove";
        const subject = isRemove ? "Removed from Mission" : "Added to Mission";
        const notifMessage = isRemove
          ? `You've been removed from ${missionLabel} by ${adminName}.`
          : `You've been added to ${missionLabel} by ${adminName}.`;

        const [notification] = await db
          .insert(notifications)
          .values({
            message: notifMessage,
            type: "system_notification",
            subject,
            sourceId: session.userId,
            redirectTo: "/my-profile",
          })
          .returning();

        await Promise.all([
          db.insert(userNotifications).values(
            notifyUserIds.map((userId) => ({
              userId,
              notificationId: notification.id,
              read: false,
            })),
          ),
          db.insert(notificationRecipients).values(
            notifyUserIds.map((userId) => ({
              notificationId: notification.id,
              userId,
            })),
          ),
        ]);

        await pushNotificationService.sendNotificationToUsers(notifyUserIds, {
          title: subject,
          body: notifMessage,
          data: {
            type: isRemove ? "mission_member_removed" : "mission_member_added",
            missionId,
          },
        });
      } catch (notifError) {
        console.error("Failed to send mission member notifications:", notifError);
      }
    }

    return NextResponse.json(
      {
        message: `${action === "remove" ? "Removed" : "Assigned"} ${usersToUpdate.length} user(s) ${action === "remove" ? "from" : "to"} mission`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error assigning mission members:", error);
    return NextResponse.json(
      { message: "Failed to assign mission members" },
      { status: 500 },
    );
  }
}
