// apps/web/app/api/telegram-thread/route.ts

import { NextResponse } from "next/server";
import {
  getPatientByTelegramChatId,
  createPatient,
} from "@/lib/telegram-db-helpers";
import { createNotificationForAccountType } from "@/utils/notifications/createNotificationForUsers";

/**
 * POST /api/telegram-thread
 *
 * Creates a new patient by Telegram chat ID or returns existing patient.
 * This is a simplified endpoint for patient creation/lookup.
 *
 * @body { chatId: string, language?: string }
 * @returns Patient creation/lookup result with dashboard URL
 *
 * @example
 * curl -X POST http://localhost:3000/api/telegram-thread \
 *   -H "Content-Type: application/json" \
 *   -d '{"chatId":"123456789","language":"en"}'
 *
 * Response (new patient):
 * {
 *   "message": "Patient created",
 *   "registrationUrl": "http://localhost:3000/new-patient/telegram/uuid"
 * }
 *
 * Response (existing patient):
 * {
 *   "message": "Patient found",
 *   "patientDashboardUrl": "http://localhost:3000/new-patient/telegram/uuid"
 * }
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { chatId, language } = body;

    console.log("[telegram-thread] POST request for chat ID:", chatId);

    if (!chatId) {
      console.error("[telegram-thread] Missing chat ID");
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 },
      );
    }

    const languageValue = language || "english";
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    console.log("[telegram-thread] Language:", languageValue);

    // Check if patient already exists
    let patient = await getPatientByTelegramChatId(chatId);
    let isNewPatient = false;

    if (!patient) {
      console.log("[telegram-thread] No patient found - Creating new patient");
      isNewPatient = true;

      // Create new patient
      patient = await createPatient({
        telegramChatId: chatId,
        language: languageValue,
        hasSubmittedInfo: false,
      });

      console.log(
        `[telegram-thread] New patient created with ID: ${patient.id}`,
      );

      // Create notification for all Triage users about the new patient
      try {
        await createNotificationForAccountType({
          message: `New patient registered via Telegram (ID: ${patient.id})`,
          accountType: "Triage",
          patientId: patient.id,
          type: "alert",
          redirectTo: "/patient-dashboard",
        });
        console.log("[telegram-thread] Triage notification created");
      } catch (notificationError) {
        // Log error but don't fail the request
        console.error(
          "[telegram-thread] Error creating notification:",
          notificationError,
        );
      }

      const registrationUrl = `${baseUrl}/new-patient/telegram/${patient.id}`;

      return NextResponse.json({
        message: "Patient created",
        registrationUrl,
      });
    }

    console.log(
      "[telegram-thread] Patient found - Returning existing patient data",
    );
    const patientDashboardUrl = `${baseUrl}/new-patient/telegram/${patient.id}`;

    return NextResponse.json({
      message: "Patient found",
      patientDashboardUrl,
    });
  } catch (error) {
    console.error("[telegram-thread] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
