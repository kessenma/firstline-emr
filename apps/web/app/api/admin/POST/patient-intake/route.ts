// app/api/admin/POST/patient-intake/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientIntakes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Parse request body
    const { intakeMessage, confirmationMessage } = await request.json();

    if (!intakeMessage) {
      return NextResponse.json(
        { error: "Intake message is required" },
        { status: 400 },
      );
    }

    // Make sure we have a valid user ID from the session
    if (!session.userId) {
      console.error("User ID missing from session");
      return NextResponse.json(
        { error: "User identification failed" },
        { status: 400 },
      );
    }

    const userId = session.userId as string;
    console.log("Creating/updating patient intake with user ID:", userId);

    // Check if a patient intake configuration already exists
    const existingIntake = await db.select().from(patientIntakes).limit(1);

    let patientIntake;

    if (existingIntake.length > 0) {
      // Update existing intake configuration
      const [updated] = await db
        .update(patientIntakes)
        .set({
          intakeMessage,
          confirmationMessage,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(patientIntakes.id, existingIntake[0].id))
        .returning();

      patientIntake = updated;
      console.log("Updated patient intake:", patientIntake);
    } else {
      // Create new intake configuration
      const [created] = await db
        .insert(patientIntakes)
        .values({
          intakeMessage,
          confirmationMessage,
          updatedBy: userId,
        })
        .returning();

      patientIntake = created;
      console.log("Created patient intake:", patientIntake);
    }

    return NextResponse.json({ success: true, patientIntake });
  } catch (error) {
    console.error("Error updating patient intake settings:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to update patient intake settings",
          details: error.message,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update patient intake settings" },
      { status: 500 },
    );
  }
}
