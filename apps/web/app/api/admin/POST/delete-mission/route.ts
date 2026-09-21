export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { users } from "@/db/schema/users";
import { patients } from "@/db/schema/patients";
import { userProfileLogs } from "@/db/schema/userProfileLogs";
import { internalMessageThreads } from "@/db/schema/internalMessageThreads";
import { notifications, userNotifications, notificationRecipients } from "@/db/schema/notifications";
import { eq, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { addMessageToInternalThread } from "@/lib/internal-messages-helpers";
import { storageService } from "@/lib/storage";
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

    const { missionId, archiveChat = true } = await request.json();

    if (!missionId) {
      return NextResponse.json(
        { message: "Mission ID is required" },
        { status: 400 },
      );
    }

    // Verify mission exists
    const [mission] = await db
      .select({ id: missions.id, name: missions.name, groupChatThreadId: missions.groupChatThreadId })
      .from(missions)
      .where(eq(missions.id, missionId));

    if (!mission) {
      return NextResponse.json(
        { message: "Mission not found" },
        { status: 404 },
      );
    }

    // Find all users who have this mission in their missions array
    const affectedUsers = await db
      .select({ id: users.id, missions: users.missions })
      .from(users)
      .where(sql`${users.missions} @> ARRAY[${missionId}]`);

    // Remove mission from each user's missions array and log the change
    for (const user of affectedUsers) {
      const oldMissions = user.missions || [];
      const newMissions = oldMissions.filter((m) => m !== missionId);

      await db
        .update(users)
        .set({ missions: newMissions })
        .where(eq(users.id, user.id));

      // Log the change in userProfileLogs
      await db.insert(userProfileLogs).values({
        userId: user.id,
        changedBy: session.userId,
        changes: [{
          field: "missions",
          oldValue: oldMissions,
          newValue: newMissions,
        }],
        isAdminAction: true,
      });
    }

    // Clear mission_id from any patients tagged to this mission
    await db
      .update(patients)
      .set({ missionId: null })
      .where(eq(patients.missionId, missionId));

    // Handle mission group chat
    if (mission.groupChatThreadId) {
      try {
        // Send farewell message from the admin
        const adminUser = await db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, session.userId))
          .then((rows) => rows[0]);

        const adminName = adminUser
          ? `${adminUser.firstName} ${adminUser.lastName}`
          : "Admin";

        await addMessageToInternalThread(mission.groupChatThreadId, {
          text: `This mission has been deleted by ${adminName}.`,
          sender: adminName,
          senderId: session.userId,
          type: "text",
        });

        if (archiveChat) {
          // Archive the thread (keep messages, make read-only)
          await db
            .update(internalMessageThreads)
            .set({ status: "archived", updatedAt: new Date() })
            .where(eq(internalMessageThreads.id, mission.groupChatThreadId));
        } else {
          // Unlink from mission first, then delete thread
          await db
            .update(missions)
            .set({ groupChatThreadId: null })
            .where(eq(missions.id, missionId));
          await db
            .delete(internalMessageThreads)
            .where(eq(internalMessageThreads.id, mission.groupChatThreadId));
        }
      } catch (err) {
        console.error("Failed to handle mission group chat cleanup:", err);
      }
    }

    // Clean up attachment files from object storage
    // (attachment rows are auto-deleted by ON DELETE CASCADE)
    const sanitizedMissionId = missionId.replace(/[^a-zA-Z0-9-]/g, "");
    const storagePrefix = `${storageService.getEnvironmentPrefix()}/missions/${sanitizedMissionId}`;
    await storageService.deleteByPrefix(storagePrefix);

    // Delete the mission itself
    await db.delete(missions).where(eq(missions.id, missionId));

    // Notify former members — in-app + push, non-blocking
    if (affectedUsers.length > 0) {
      try {
        const adminName = [session.firstName, session.lastName]
          .filter(Boolean)
          .join(" ") || "An admin";
        const notifMessage = `The mission "${mission.name}" has been deleted by ${adminName} and removed from your profile.`;
        const memberIds = affectedUsers.map((u) => u.id);

        const [notification] = await db
          .insert(notifications)
          .values({
            message: notifMessage,
            type: "system_notification",
            subject: "Mission Deleted",
            sourceId: session.userId,
            redirectTo: "/my-profile",
          })
          .returning();

        await Promise.all([
          db.insert(userNotifications).values(
            memberIds.map((userId) => ({
              userId,
              notificationId: notification.id,
              read: false,
            })),
          ),
          db.insert(notificationRecipients).values(
            memberIds.map((userId) => ({
              notificationId: notification.id,
              userId,
            })),
          ),
        ]);

        await pushNotificationService.sendNotificationToUsers(memberIds, {
          title: "Mission Deleted",
          body: notifMessage,
          data: {
            type: "mission_deleted",
            missionId,
          },
        });
      } catch (notifError) {
        console.error("Failed to send mission deletion notifications:", notifError);
      }
    }

    return NextResponse.json(
      {
        message: "Mission deleted successfully",
        affectedUsers: affectedUsers.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting mission:", error);
    return NextResponse.json(
      { message: "Failed to delete mission" },
      { status: 500 },
    );
  }
}
