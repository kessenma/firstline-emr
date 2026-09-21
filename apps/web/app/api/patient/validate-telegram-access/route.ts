// app/api/patient/validate-telegram-access/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// This API validates a patient's access based on the patient ID and Telegram chat ID
export async function GET(request: NextRequest) {
  try {
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const telegramChatId = searchParams.get("telegramChatId");

    console.log("[Debug] Validating Telegram access:", {
      patientId,
      telegramChatId,
    });

    // Validate required parameters
    if (!patientId || !telegramChatId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          valid: false,
        },
        { status: 400 },
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        {
          error: "Invalid patient ID format",
          valid: false,
        },
        { status: 400 },
      );
    }

    // Find the patient by ID
    const patient = await db
      .select({
        id: patients.id,
        telegramChatId: patients.telegramChatId,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    // If patient doesn't exist, return error
    if (!patient || patient.length === 0) {
      console.log("[Debug] Patient not found:", patientId);
      return NextResponse.json(
        {
          error: "Patient not found",
          valid: false,
        },
        { status: 404 },
      );
    }

    const foundPatient = patient[0];

    // Verify the Telegram chat ID matches
    if (foundPatient.telegramChatId !== telegramChatId) {
      console.log("[Debug] Telegram Chat ID mismatch:", {
        expected: foundPatient.telegramChatId,
        received: telegramChatId,
      });
      return NextResponse.json(
        {
          error: "Unauthorized: Telegram Chat ID mismatch",
          valid: false,
        },
        { status: 401 },
      );
    }

    console.log("[Debug] Telegram access validated successfully:", patientId);

    // If everything is valid, return success
    return NextResponse.json(
      {
        valid: true,
        patientId: foundPatient.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Error] Error validating patient access:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        valid: false,
      },
      { status: 500 },
    );
  }
}
