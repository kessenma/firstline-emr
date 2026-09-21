// apps/web/app/api/telegram-intake-form/[token]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { isValidUuid } from "@/lib/validation";
import { validateIntakeToken, getPatientById } from "@/lib/telegram-db-helpers";

/**
 * GET /api/telegram-intake-form/[token]
 *
 * Validates an intake token and returns the associated patient data.
 *
 * @param token - Secure token string (64-char hex)
 * @returns Patient data and token submission status
 *
 * @example
 * curl "http://localhost:3000/api/telegram-intake-form/abc123..."
 *
 * Response:
 * {
 *   "patient": { ... },
 *   "tokenSubmitted": false
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  console.log(
    "[telegram-intake-form][GET] Received token:",
    token?.substring(0, 8) + "...",
  );

  if (!token) {
    return NextResponse.json(
      { error: "Missing token", invalidId: true },
      { status: 400 },
    );
  }

  try {
    // Validate the token
    console.log("[telegram-intake-form][GET] Validating token");
    const tokenData = await validateIntakeToken(token);

    if (!tokenData) {
      console.error("[telegram-intake-form][GET] Invalid or expired token");
      return NextResponse.json(
        { error: "Invalid or expired token", invalidId: true },
        { status: 400 },
      );
    }

    const { patientId, telegramChatId, submitted } = tokenData;

    console.log(
      "[telegram-intake-form][GET] Token valid - Patient ID:",
      patientId,
    );

    // Validate patient ID format
    if (!isValidUuid(patientId)) {
      console.error(
        "[telegram-intake-form][GET] Invalid patient ID format:",
        patientId,
      );
      return NextResponse.json(
        { error: "Invalid patient ID format", invalidId: true },
        { status: 400 },
      );
    }

    // Lookup patient by ID
    const patient = await getPatientById(patientId);

    if (!patient) {
      console.warn("[telegram-intake-form][GET] Patient not found:", patientId);
      return NextResponse.json(
        { error: "Patient not found", invalidId: true },
        { status: 404 },
      );
    }

    // Validate the telegramChatId matches the patient record
    if (patient.telegramChatId !== telegramChatId) {
      console.warn(
        `[telegram-intake-form][GET] Telegram Chat ID mismatch: Expected ${patient.telegramChatId} but got ${telegramChatId}`,
      );
      return NextResponse.json(
        { error: "Unauthorized", invalidId: true },
        { status: 401 },
      );
    }

    console.log("[telegram-intake-form][GET] Success - Returning patient data");

    // Return patient data along with token submission status
    return NextResponse.json({
      patient,
      tokenSubmitted: submitted,
    });
  } catch (error) {
    console.error("[telegram-intake-form][GET] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", invalidId: true },
      { status: 500 },
    );
  }
}

/**
 * POST /api/telegram-intake-form/[token]
 *
 * Submits patient intake form data and marks the token as used.
 *
 * @param token - Secure token string (64-char hex)
 * @body Patient form data (firstName, lastName, etc.)
 * @returns Updated patient data and token submission status
 *
 * @example
 * curl -X POST "http://localhost:3000/api/telegram-intake-form/abc123..." \
 *   -H "Content-Type: application/json" \
 *   -d '{"firstName":"John","lastName":"Doe","phoneNumber":"1234567890"}'
 *
 * Response:
 * {
 *   "patient": { ... },
 *   "tokenSubmitted": true
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  console.log(
    "[telegram-intake-form][POST] Received token:",
    token?.substring(0, 8) + "...",
  );

  if (!token) {
    return NextResponse.json(
      { error: "Missing token", invalidId: true },
      { status: 400 },
    );
  }

  try {
    // Validate the token
    console.log("[telegram-intake-form][POST] Validating token");
    const tokenData = await validateIntakeToken(token);

    if (!tokenData) {
      console.error("[telegram-intake-form][POST] Invalid or expired token");
      return NextResponse.json(
        { error: "Invalid or expired token", invalidId: true },
        { status: 400 },
      );
    }

    const { patientId, telegramChatId } = tokenData;

    console.log(
      "[telegram-intake-form][POST] Token valid - Patient ID:",
      patientId,
    );

    // Validate patient ID format
    if (!isValidUuid(patientId)) {
      console.error(
        "[telegram-intake-form][POST] Invalid patient ID format:",
        patientId,
      );
      return NextResponse.json(
        { error: "Invalid patient ID format", invalidId: true },
        { status: 400 },
      );
    }

    // Find patient
    const patient = await getPatientById(patientId);

    if (!patient) {
      console.warn(
        "[telegram-intake-form][POST] Patient not found:",
        patientId,
      );
      return NextResponse.json(
        { error: "Patient not found", invalidId: true },
        { status: 404 },
      );
    }

    // Validate the telegramChatId matches the patient record
    if (patient.telegramChatId !== telegramChatId) {
      console.warn(
        `[telegram-intake-form][POST] Telegram Chat ID mismatch: Expected ${patient.telegramChatId} but got ${telegramChatId}`,
      );
      return NextResponse.json(
        { error: "Unauthorized", invalidId: true },
        { status: 401 },
      );
    }

    // Get form data from request body
    const formData = await request.json();
    console.log("[telegram-intake-form][POST] Received form data");

    // Import here to avoid circular dependencies
    const { updatePatientById, markTokenAsSubmitted } = await import(
      "@/lib/telegram-db-helpers"
    );
    const { getActiveIntakeMission } = await import(
      "@/lib/missions/getActiveIntakeMission"
    );

    // Auto-tag with active intake mission + optional default hospital
    const activeMission = await getActiveIntakeMission();
    const missionTag = activeMission
      ? {
          missionId: activeMission.id,
          ...(activeMission.defaultIntakeHospital
            ? { hospital: activeMission.defaultIntakeHospital }
            : {}),
        }
      : {};

    // Update patient with form data
    const updatedPatient = await updatePatientById(patientId, {
      ...formData,
      ...missionTag,
      hasSubmittedInfo: true,
    });

    if (!updatedPatient) {
      console.error("[telegram-intake-form][POST] Failed to update patient");
      return NextResponse.json(
        { error: "Failed to update patient" },
        { status: 500 },
      );
    }

    console.log("[telegram-intake-form][POST] Patient updated successfully");

    // Mark the token as submitted
    await markTokenAsSubmitted(token);
    console.log(`[telegram-intake-form][POST] Token marked as submitted`);

    // Send thank you message to patient via Telegram
    try {
      const { sendPatientRegistrationMessage } = await import(
        "@/utils/telegram/signupConfirmation"
      );
      const { getRegistrationMessage } = await import(
        "@/utils/telegram/postRegistrationConfirmation"
      );

      // Get the language from the updated patient data
      const patientLanguage = updatedPatient.language || formData.preferredLanguage || "english";
      const thankYouMessage = getRegistrationMessage(patientLanguage);

      await sendPatientRegistrationMessage(telegramChatId, thankYouMessage);
      console.log(
        `[telegram-intake-form][POST] Sent registration confirmation to chat ${telegramChatId} in ${patientLanguage}`,
      );
    } catch (telegramError) {
      // Log the error but don't fail the request
      console.error(
        "[telegram-intake-form][POST] Error sending Telegram confirmation:",
        telegramError,
      );
    }

    // Create triage notification using the specialized function
    try {
      const { createTriageNotification } = await import(
        "@/utils/notifications/triageNotification"
      );

      const patientName =
        `${updatedPatient.firstName || ""} ${updatedPatient.lastName || ""}`.trim() ||
        "New patient";

      // Create a triage notification for this patient registration
      const { notification, userNotifications, emailsSent } =
        await createTriageNotification({
          message: `New patient registration: ${patientName} via Telegram`,
          patientId,
          patientName,
          eventType: "registration",
          redirectTo: `/patient/${patientId}`,
        });

      console.log(
        `[telegram-intake-form][POST] Created triage notification for ${userNotifications.length} staff members (${emailsSent} emails)`,
      );
    } catch (notificationError) {
      // Log the error but don't fail the request
      console.error(
        "[telegram-intake-form][POST] Error creating triage notifications:",
        notificationError,
      );
    }

    console.log(
      "[telegram-intake-form][POST] Success - Returning updated patient",
    );

    return NextResponse.json({
      patient: updatedPatient,
      tokenSubmitted: true,
    });
  } catch (error) {
    console.error("[telegram-intake-form][POST] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", invalidId: true },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
