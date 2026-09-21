// app/api/missions/[missionId]/leave/route.ts
// Self-serve mission leave — removes the caller from users.missions,
// logs the change, and removes them from the mission group chat.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { missions } from "@/db/schema/missions";
import { userProfileLogs } from "@/db/schema/userProfileLogs";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { leaveThread } from "@/lib/internal-messages-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { missionId } = await params;
    if (!missionId) {
      return NextResponse.json(
        { message: "Mission ID is required" },
        { status: 400 },
      );
    }

    const currentUser = await db
      .select({ missions: users.missions })
      .from(users)
      .where(eq(users.id, session.userId))
      .then((rows) => rows[0]);

    const currentMissions = currentUser?.missions || [];
    if (!currentMissions.includes(missionId)) {
      return NextResponse.json(
        { message: "You are not a member of this mission" },
        { status: 400 },
      );
    }

    const newMissions = currentMissions.filter((id: string) => id !== missionId);

    await db
      .update(users)
      .set({ missions: newMissions, updatedAt: new Date() })
      .where(eq(users.id, session.userId));

    await db.insert(userProfileLogs).values({
      userId: session.userId,
      changedBy: session.userId,
      changes: [
        {
          field: "missions",
          oldValue: currentMissions,
          newValue: newMissions,
        },
      ],
      isAdminAction: false,
    });

    // Remove from the mission group chat — non-fatal (leaveThread throws on
    // system groups and non-participants; membership removal must still succeed)
    try {
      const mission = await db
        .select({ groupChatThreadId: missions.groupChatThreadId })
        .from(missions)
        .where(eq(missions.id, missionId))
        .then((rows) => rows[0]);

      if (mission?.groupChatThreadId) {
        await leaveThread(mission.groupChatThreadId, session.userId);
      }
    } catch (chatError) {
      console.error("⚠️ Failed to remove user from mission group chat:", chatError);
    }

    return NextResponse.json(
      { message: "Left mission", missions: newMissions },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error leaving mission:", error);
    return NextResponse.json(
      { message: "Failed to leave mission" },
      { status: 500 },
    );
  }
}
