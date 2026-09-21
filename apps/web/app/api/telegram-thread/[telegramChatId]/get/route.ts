// apps/web/app/api/telegram-thread/[telegramChatId]/get/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getTelegramThreadByChatId } from "@/lib/telegram-db-helpers";
import { db } from "@/db";
import { telegramThreadParticipants, users, patients } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/telegram-thread/[telegramChatId]/get
 *
 * Retrieves a Telegram thread with messages, patient details, and participant information.
 * Requires authentication (session).
 *
 * @param telegramChatId - Telegram chat ID (from URL path)
 * @returns Thread messages and metadata (patient, participants, status)
 *
 * @example
 * curl -H "Cookie: next-auth.session-token=..." \
 *   http://localhost:3000/api/telegram-thread/123456789/get
 *
 * Response:
 * {
 *   "messages": [ ... ],
 *   "threadInfo": {
 *     "patientId": "uuid",
 *     "patient": { "firstName": "John", ... },
 *     "participants": [ { "firstName": "Dr. Smith", ... } ],
 *     "unreadCount": 5,
 *     "status": "active"
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);
  if (!session) {
    console.warn("[get-thread] Unauthorized - No valid user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const { telegramChatId } = params;

  console.log("[get-thread] GET request for chat ID:", telegramChatId);

  if (!telegramChatId) {
    console.error("[get-thread] Telegram Chat ID is missing");
    return NextResponse.json(
      { error: "Telegram Chat ID is required" },
      { status: 400 },
    );
  }

  try {
    // Fetch the thread for the given chat ID
    console.log(`[get-thread] Fetching thread for Chat ID: ${telegramChatId}`);
    const thread = await getTelegramThreadByChatId(telegramChatId);

    if (!thread) {
      console.error(
        `[get-thread] Thread not found for Chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    console.log(`[get-thread] Thread found with ID: ${thread.id}`);

    // Get participant details if there are participants
    let participantDetails = [];

    // Fetch participants from the junction table
    const participantRecords = await db
      .select({
        user: users,
      })
      .from(telegramThreadParticipants)
      .innerJoin(users, eq(telegramThreadParticipants.userId, users.id))
      .where(eq(telegramThreadParticipants.threadId, thread.id));

    participantDetails = participantRecords.map((record) => ({
      id: record.user.id,
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      email: record.user.email,
      image: record.user.image,
    }));

    console.log(`[get-thread] Found ${participantDetails.length} participants`);

    // Fetch patient details if patient exists
    let patientDetails = null;
    if (thread.patientId) {
      console.log(
        `[get-thread] Fetching patient details for ID: ${thread.patientId}`,
      );

      const [patient] = await db
        .select({
          firstName: patients.firstName,
          lastName: patients.lastName,
          email: patients.email,
          telegramChatId: patients.telegramChatId,
        })
        .from(patients)
        .where(eq(patients.id, thread.patientId))
        .limit(1);

      if (patient) {
        patientDetails = {
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          telegramChatId: patient.telegramChatId,
        };
        console.log(`[get-thread] Patient details found:`, patientDetails);
      } else {
        console.log(
          `[get-thread] No patient found for ID: ${thread.patientId}`,
        );
      }
    }

    console.log(
      `[get-thread] Returning ${(thread.messages as any[])?.length || 0} messages`,
    );

    return NextResponse.json({
      messages: thread.messages || [],
      threadInfo: {
        patientId: thread.patientId || null,
        patient: patientDetails,
        participants: participantDetails,
        unreadCount: thread.unreadCount,
        status: thread.status,
      },
    });
  } catch (error) {
    console.error("[get-thread] Error retrieving messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
