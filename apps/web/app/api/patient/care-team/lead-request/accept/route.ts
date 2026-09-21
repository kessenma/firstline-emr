// app/api/patient/care-team/lead-request/accept/route.ts
// Accept a lead request — swap roles: requesting doctor becomes lead, old lead becomes assistant

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patientCareTeam } from "@/db/schema";
import { internalMessages } from "@/db/schema/internalMessages";
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
    const {
      messageId,
      patientId,
      requestingUserId,
      requestingCareTeamId,
      currentLeadCareTeamId,
    } = body;

    // Validate required fields
    if (!messageId || !patientId || !requestingUserId || !requestingCareTeamId || !currentLeadCareTeamId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the caller is actually the current lead for this patient
    const [callerRecord] = await db
      .select()
      .from(patientCareTeam)
      .where(
        and(
          eq(patientCareTeam.id, currentLeadCareTeamId),
          eq(patientCareTeam.userId, session.userId),
          eq(patientCareTeam.isLead, true),
          isNull(patientCareTeam.removedAt),
        ),
      )
      .limit(1);

    if (!callerRecord) {
      return NextResponse.json(
        { error: "Only the current lead can accept this request" },
        { status: 403 },
      );
    }

    // Promote requesting doctor: role -> surgeon, isLead -> true
    await db
      .update(patientCareTeam)
      .set({ role: "surgeon", isLead: true, updatedAt: new Date() })
      .where(eq(patientCareTeam.id, requestingCareTeamId));

    // Demote current lead: role -> assistant, isLead -> false
    await db
      .update(patientCareTeam)
      .set({ role: "assistant", isLead: false, updatedAt: new Date() })
      .where(eq(patientCareTeam.id, currentLeadCareTeamId));

    // Sync care team JSON to patient record
    await syncCareTeamToPatient(patientId);

    // Update the lead-request message status to "accepted"
    if (UUID_REGEX.test(messageId)) {
      try {
        const [msg] = await db
          .select()
          .from(internalMessages)
          .where(eq(internalMessages.id, messageId))
          .limit(1);

        if (msg) {
          const parsed = JSON.parse(msg.text);
          parsed.status = "accepted";
          await db
            .update(internalMessages)
            .set({ text: JSON.stringify(parsed), updatedAt: new Date() })
            .where(eq(internalMessages.id, messageId));
        }
      } catch (msgErr) {
        console.error("[lead-request/accept] Failed to update message:", msgErr);
      }
    }

    // Notify requesting user
    try {
      await notificationService.send({
        type: "alert",
        message: `Your lead request has been accepted. You are now the lead surgeon.`,
        recipientIds: [requestingUserId],
        title: "Lead Request Accepted",
        patientId,
      });
    } catch (notifErr) {
      console.error("[lead-request/accept] Failed to send notification:", notifErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[lead-request/accept POST] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
