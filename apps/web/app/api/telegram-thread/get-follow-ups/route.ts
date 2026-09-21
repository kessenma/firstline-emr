// apps/web/app/api/telegram-thread/get-follow-ups/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { validateApiKey } from "@/utils/telegram/validateApiKey";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { patientFollowUps, telegramThreads, patients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/telegram-thread/get-follow-ups
 *
 * Retrieves all follow-up records with thread and patient information.
 * Supports both API key and session-based authentication.
 * Session users must have Triage role.
 *
 * @returns Array of follow-up records with thread details
 *
 * @example
 * curl -H "Authorization: Bearer YOUR_API_KEY" \
 *   http://localhost:3000/api/telegram-thread/get-follow-ups
 *
 * Response:
 * {
 *   "followUps": [
 *     {
 *       "id": "uuid",
 *       "chatId": "123456789",
 *       "message": "Follow-up sent",
 *       "followUpSentAt": "2024-01-01T00:00:00.000Z",
 *       "thread": {
 *         "id": "uuid",
 *         "chatId": "123456789",
 *         "patientName": "John Doe"
 *       }
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  // First try to authenticate with the API key
  const authHeader = req.headers.get("authorization");
  const isValidApiKey = await validateApiKey(authHeader);

  // If API key validation fails, check if the user is authenticated
  if (!isValidApiKey) {
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);

    // Check if any valid authentication method is present with Triage role
    const hasValidSession = session && session.accountType === "Triage";
    const hasValidMobileUser =
      session && session.userId && session.accountType === "Triage";

    if (!hasValidSession && !hasValidMobileUser) {
      console.warn(
        "[get-follow-ups] Unauthorized - No valid API key, Triage session, or Triage mobile token",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (hasValidSession) {
      console.log("[get-follow-ups] Authenticated via session:", session.email);
    } else if (hasValidMobileUser) {
      console.log(
        "[get-follow-ups] Authenticated via mobile token:",
        session.email,
      );
    }
  } else {
    console.log("[get-follow-ups] Authenticated via API key");
  }

  try {
    console.log("[get-follow-ups] Fetching follow-ups");

    // Fetch all follow-ups with thread and patient information
    const followUpsWithThreads = await db
      .select({
        followUp: patientFollowUps,
        thread: telegramThreads,
        patient: {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
        },
      })
      .from(patientFollowUps)
      .leftJoin(
        telegramThreads,
        eq(patientFollowUps.telegramThreadId, telegramThreads.id),
      )
      .leftJoin(patients, eq(telegramThreads.patientId, patients.id))
      .orderBy(desc(patientFollowUps.createdAt));

    // Format the response to match the expected structure
    const followUps = followUpsWithThreads.map((record) => {
      // Build patient name from patient data
      let patientName = "Unknown";
      if (record.patient) {
        const firstName = record.patient.firstName || "";
        const lastName = record.patient.lastName || "";
        patientName = `${firstName} ${lastName}`.trim() || "Unknown";
      }

      return {
        id: record.followUp.id,
        chatId: record.followUp.chatId,
        telegramThreadId: record.followUp.telegramThreadId,
        message: record.followUp.message,
        followUpSentAt: record.followUp.followUpSentAt,
        createdAt: record.followUp.createdAt,
        updatedAt: record.followUp.updatedAt,
        thread: record.thread
          ? {
              id: record.thread.id,
              chatId: record.thread.chatId,
              patientName,
            }
          : null,
      };
    });

    console.log(`[get-follow-ups] Retrieved ${followUps.length} follow-ups`);

    return NextResponse.json({ followUps }, { status: 200 });
  } catch (error) {
    console.error("[get-follow-ups] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
