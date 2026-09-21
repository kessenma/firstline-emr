// apps/web/app/api/patient/[id]/telegram-intake/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, telegramIntakeTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Helper function to validate token (replaces TelegramIntakeToken.validateToken)
async function validateToken(token: string) {
  try {
    const now = new Date();

    const tokenData = await db
      .select({
        patientId: telegramIntakeTokens.patientId,
        telegramChatId: telegramIntakeTokens.telegramChatId,
      })
      .from(telegramIntakeTokens)
      .where(
        and(
          eq(telegramIntakeTokens.token, token),
          eq(telegramIntakeTokens.isValid, true),
          gt(telegramIntakeTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (tokenData.length === 0) {
      return null;
    }

    return tokenData[0];
  } catch (error) {
    console.error("Error validating token:", error);
    return null;
  }
}

// GET: Retrieve patient data by validating the token
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: token } = await context.params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    // Validate the token
    const tokenData = await validateToken(token);
    if (!tokenData) {
      console.error("Invalid or expired token:", token);
      return NextResponse.json(
        { error: "Invalid token", invalidId: true },
        { status: 400 }
      );
    }

    const { patientId, telegramChatId } = tokenData;

    // Lookup patient
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json(
        { error: "Patient not found", invalidId: true },
        { status: 404 }
      );
    }

    // Validate the telegramChatId matches the patient record
    if (patient[0].telegramChatId !== telegramChatId) {
      return NextResponse.json(
        { error: "Telegram Chat ID mismatch", invalidId: true },
        { status: 401 }
      );
    }

    // Return patient data
    return NextResponse.json({ patient: patient[0] });
  } catch (error) {
    console.error("Error in GET /telegram-intake:", error);
    return NextResponse.json(
      { error: "Internal Server Error", invalidId: true },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: token } = await context.params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    // Validate the token
    const tokenData = await validateToken(token);
    if (!tokenData) {
      console.error("Invalid or expired token:", token);
      return NextResponse.json(
        { error: "Invalid token", invalidId: true },
        { status: 400 }
      );
    }

    const { patientId, telegramChatId } = tokenData;

    // Find patient
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json(
        { error: "Patient not found", invalidId: true },
        { status: 404 }
      );
    }

    if (patient[0].telegramChatId !== telegramChatId) {
      return NextResponse.json(
        { error: "Telegram Chat ID mismatch", invalidId: true },
        { status: 401 }
      );
    }

    // Update with form data
    const formData = await request.json();

    // Build update object
    const updateData: any = {
      ...formData,
      hasSubmittedInfo: true,
      updatedAt: new Date(),
    };

    // Update patient
    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId));

    // Mark token as submitted
    await db
      .update(telegramIntakeTokens)
      .set({
        submitted: true,
        submittedAt: new Date(),
      })
      .where(eq(telegramIntakeTokens.token, token));

    // Get updated patient data
    const updatedPatient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    return NextResponse.json(
      {
        message: "Patient updated successfully",
        patient: updatedPatient[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /telegram-intake:", error);
    return NextResponse.json(
      { error: "Internal Server Error", invalidId: true },
      { status: 500 }
    );
  }
}
