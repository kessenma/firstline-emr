// app/api/patient/[id]/triage/route.ts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordPatientEditor } from "@/lib/server/ensureCareTeamMembership";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TriageRequestBody {
  specialty?: string;
  specialties?: string[];
  hospital?: string | null;
  triagedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract ID from the URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const id = pathParts[pathParts.length - 2]; // Get the ID from /api/patient/[id]/triage

    console.log("[Debug] Triage request for patient ID:", id);

    if (!id) {
      return NextResponse.json(
        { message: "Patient ID is required." },
        { status: 400 },
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { message: "Invalid patient ID format." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as TriageRequestBody;
    const { specialty, specialties, hospital, triagedBy } = body;

    console.log("[Debug] Triage data:", { specialty, specialties, hospital, triagedBy });

    // Check if patient exists
    const existingPatient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!existingPatient || existingPatient.length === 0) {
      return NextResponse.json(
        { message: "Patient not found." },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle specialty/specialties
    if (specialty) {
      updateData.specialties = [specialty];
      updateData.hasSpecialtyWithoutDoctors = false;
    } else if (specialties) {
      updateData.specialties = specialties;
      updateData.hasSpecialtyWithoutDoctors = false;
    }

    // Handle hospital
    if (hospital !== undefined) {
      updateData.hospital = hospital;
    }

    // Handle triagedBy
    if (triagedBy) {
      updateData.triagedBy = triagedBy;
    }

    console.log("[Debug] Updating patient with data:", updateData);

    // Perform update
    const updatedPatient = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, id))
      .returning();

    console.log(
      "[Debug] Patient specialty updated successfully:",
      updatedPatient[0].id,
    );

    // Assigning a specialty is the defining triage action — record it.
    await recordPatientEditor({
      patientId: id,
      userId: session.userId,
      accountType: session.accountType,
    });

    return NextResponse.json(
      {
        message: "Patient specialty updated successfully!",
        patient: updatedPatient[0],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Error] Error updating patient:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to update patient.", error: errorMessage },
      { status: 500 },
    );
  }
}
