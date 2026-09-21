// app/api/patient/care-team/lead-request/decline/route.ts
// Decline a lead request — no role changes, just update message status

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patientCareTeam } from "@/db/schema";
import { internalMessages } from "@/db/schema/internalMessages";
import { eq, and, isNull } from "drizzle-orm";
import { notificationService } from "@/lib/NotificationService";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, patientId, requestingUserId } = body;

    if (!messageId || !patientId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the caller is actually a lead for this patient
    const [callerLead] = await db
      .select()
      .from(patientCareTeam)
      .where(
        and(
          eq(patientCareTeam.patientId, patientId),
          eq(patientCareTeam.userId, session.userId),
          eq(patientCareTeam.isLead, true),
          isNull(patientCareTeam.removedAt),
        ),
      )
      .limit(1);

    if (!callerLead) {
      return NextResponse.json(
        { error: "Only the current lead can decline this request" },
        { status: 403 },
      );
    }

    // Update the lead-request message status to "declined"
    if (UUID_REGEX.test(messageId)) {
      try {
        const [msg] = await db
          .select()
          .from(internalMessages)
          .where(eq(internalMessages.id, messageId))
          .limit(1);

        if (msg) {
          const parsed = JSON.parse(msg.text);
          parsed.status = "declined";
          await db
            .update(internalMessages)
            .set({ text: JSON.stringify(parsed), updatedAt: new Date() })
            .where(eq(internalMessages.id, messageId));
        }
      } catch (msgErr) {
        console.error("[lead-request/decline] Failed to update message:", msgErr);
      }
    }

    // Notify requesting user
    if (requestingUserId) {
      try {
        await notificationService.send({
          type: "alert",
          message: "Your lead request has been declined.",
          recipientIds: [requestingUserId],
          title: "Lead Request Declined",
          patientId,
        });
      } catch (notifErr) {
        console.error("[lead-request/decline] Failed to send notification:", notifErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[lead-request/decline POST] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
