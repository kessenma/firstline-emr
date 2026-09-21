// app/api/patient/care-team/resolve-conflict/route.ts
// Resolve a care team conflict by picking a winner lead doctor

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import {
  patientCareTeam,
  careTeamConflicts,
} from "@/db/schema";
import { users } from "@/db/schema/users";
import { eq, and, isNull } from "drizzle-orm";
import { notificationService } from "@/lib/NotificationService";
import { syncCareTeamToPatient } from "@/lib/server/syncCareTeamToPatient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conflictId, winnerUserId, resolutionNotes } = body;

    if (!conflictId || !UUID_REGEX.test(conflictId)) {
      return NextResponse.json(
        { error: "Valid conflictId is required" },
        { status: 400 },
      );
    }

    if (!winnerUserId || !UUID_REGEX.test(winnerUserId)) {
      return NextResponse.json(
        { error: "Valid winnerUserId is required" },
        { status: 400 },
      );
    }

    // Fetch the conflict
    const [conflict] = await db
      .select()
      .from(careTeamConflicts)
      .where(eq(careTeamConflicts.id, conflictId))
      .limit(1);

    if (!conflict) {
      return NextResponse.json(
        { error: "Conflict not found" },
        { status: 404 },
      );
    }

    if (conflict.status === "resolved") {
      return NextResponse.json(
        { error: "Conflict is already resolved" },
        { status: 400 },
      );
    }

    // Get all active care team members for this patient who are leads
    const activeLeads = await db
      .select()
      .from(patientCareTeam)
      .where(
        and(
          eq(patientCareTeam.patientId, conflict.patientId),
          eq(patientCareTeam.isLead, true),
          isNull(patientCareTeam.removedAt),
        ),
      );

    // Set winner as lead, all others as not lead
    for (const member of activeLeads) {
      if (member.userId === winnerUserId) {
        await db
          .update(patientCareTeam)
          .set({ isLead: true, updatedAt: new Date() })
          .where(eq(patientCareTeam.id, member.id));
      } else {
        await db
          .update(patientCareTeam)
          .set({ isLead: false, updatedAt: new Date() })
          .where(eq(patientCareTeam.id, member.id));
      }
    }

    // Mark conflict as resolved
    await db
      .update(careTeamConflicts)
      .set({
        status: "resolved",
        resolvedBy: session.userId,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || null,
      })
      .where(eq(careTeamConflicts.id, conflictId));

    // Sync care team JSON to patient record
    await syncCareTeamToPatient(conflict.patientId);

    // Fetch winner user info for notification
    const [winnerUser] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, winnerUserId))
      .limit(1);

    // Notify affected users
    const affectedUserIds = conflict.conflictingUserIds.filter(
      (id): id is string => id !== null,
    );
    if (affectedUserIds.length > 0) {
      try {
        await notificationService.send({
          type: "alert",
          message: `Care team conflict resolved. ${winnerUser ? `${winnerUser.firstName} ${winnerUser.lastName}` : "A doctor"} has been confirmed as lead.`,
          recipientIds: affectedUserIds,
          title: "Care Team Conflict Resolved",
          patientId: conflict.patientId,
        });
      } catch (notifError) {
        console.error(
          "[resolve-conflict] Failed to send notification:",
          notifError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      conflictId,
      winnerUserId,
    });
  } catch (error) {
    console.error("[resolve-conflict POST] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
