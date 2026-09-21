export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missionRequests } from "@/db/schema/missionRequests";
import { missions } from "@/db/schema/missions";
import { users } from "@/db/schema/users";
import { userProfileLogs } from "@/db/schema/userProfileLogs";
import { notifications, userNotifications, notificationRecipients } from "@/db/schema/notifications";
import { eq } from "drizzle-orm";
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

    const { requestId, action, reviewNotes } = await request.json();

    if (!requestId || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { message: "requestId and action (approve/deny) are required" },
        { status: 400 },
      );
    }

    // Fetch the request
    const missionRequest = await db
      .select()
      .from(missionRequests)
      .where(eq(missionRequests.id, requestId))
      .then((rows) => rows[0]);

    if (!missionRequest) {
      return NextResponse.json(
        { message: "Request not found" },
        { status: 404 },
      );
    }

    if (missionRequest.status !== "pending") {
      return NextResponse.json(
        { message: "Request has already been reviewed" },
        { status: 400 },
      );
    }

    const newStatus = action === "approve" ? "approved" : "denied";

    await db.transaction(async (tx) => {
      // Update request status
      await tx
        .update(missionRequests)
        .set({
          status: newStatus,
          reviewedBy: session.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(missionRequests.id, requestId));

      // If approved, add user to the mission
      if (action === "approve") {
        const user = await tx
          .select({ id: users.id, missions: users.missions })
          .from(users)
          .where(eq(users.id, missionRequest.userId))
          .then((rows) => rows[0]);

        if (user) {
          const currentMissions = user.missions || [];
          if (!currentMissions.includes(missionRequest.missionId)) {
            const newMissions = [...currentMissions, missionRequest.missionId];
            await tx
              .update(users)
              .set({ missions: newMissions, updatedAt: new Date() })
              .where(eq(users.id, user.id));

            // Log the change
            await tx.insert(userProfileLogs).values({
              userId: user.id,
              changedBy: session.userId,
              changes: [
                {
                  field: "missions",
                  oldValue: currentMissions,
                  newValue: newMissions,
                },
              ],
              isAdminAction: true,
            });
          }
        }

        // Auto-add to mission group chat if it exists
        const mission = await tx
          .select({ groupChatThreadId: missions.groupChatThreadId })
          .from(missions)
          .where(eq(missions.id, missionRequest.missionId))
          .then((rows) => rows[0]);

        if (mission?.groupChatThreadId) {
          try {
            await addParticipantsToThread(
              mission.groupChatThreadId,
              [missionRequest.userId],
              session.userId,
            );
          } catch (err) {
            console.error("Failed to add user to mission group chat:", err);
          }
        }
      }
    });

    // Send in-app notification + push notification (non-blocking)
    try {
      const mission = await db
        .select({ name: missions.name, country: missions.country })
        .from(missions)
        .where(eq(missions.id, missionRequest.missionId))
        .then((rows) => rows[0]);

      const missionLabel = mission
        ? `${mission.name} (${mission.country})`
        : "a mission";

      const adminName = [session.firstName, session.lastName]
        .filter(Boolean)
        .join(" ") || "An admin";

      const notifMessage =
        action === "approve"
          ? `Your request to join ${missionLabel} has been approved by ${adminName}.${reviewNotes ? ` Note: ${reviewNotes}` : ""}`
          : `Your request to join ${missionLabel} has been denied by ${adminName}.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`;

      // Create in-app notification
      const [notification] = await db
        .insert(notifications)
        .values({
          message: notifMessage,
          type: "system_notification",
          subject: action === "approve" ? "Mission Request Approved" : "Mission Request Denied",
          sourceId: missionRequest.userId,
          redirectTo: "/my-profile",
        })
        .returning();

      await Promise.all([
        db.insert(userNotifications).values({
          userId: missionRequest.userId,
          notificationId: notification.id,
          read: false,
        }),
        db.insert(notificationRecipients).values({
          notificationId: notification.id,
          userId: missionRequest.userId,
        }),
      ]);

      // Send push notification
      const pushTitle =
        action === "approve"
          ? "Mission Request Approved"
          : "Mission Request Denied";

      await pushNotificationService.sendNotificationToUser(
        missionRequest.userId,
        {
          title: pushTitle,
          body: notifMessage,
          data: {
            type: "mission_request_review",
            action,
            missionId: missionRequest.missionId,
            requestId: missionRequest.id,
          },
        },
      );
    } catch (notifError) {
      // Don't fail the request if notifications fail
      console.error("Failed to send mission request notification:", notifError);
    }

    return NextResponse.json(
      { message: `Request ${newStatus}`, status: newStatus },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error reviewing mission request:", error);
    return NextResponse.json(
      { message: "Failed to review mission request" },
      { status: 500 },
    );
  }
}
