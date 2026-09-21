export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, patientDrafts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Publish a draft — moves it from patient_drafts to patients table
export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { draftId, ...overrideFields } = payload;

    if (!draftId || !UUID_REGEX.test(draftId)) {
      return NextResponse.json(
        { error: "Valid draft ID is required" },
        { status: 400 },
      );
    }

    // 1. Fetch the draft (must be owned by current user)
    const draftRows = await db
      .select()
      .from(patientDrafts)
      .where(
        and(
          eq(patientDrafts.id, draftId),
          eq(patientDrafts.createdById, session.userId),
        ),
      )
      .limit(1);

    if (draftRows.length === 0) {
      return NextResponse.json(
        { error: "Draft not found or not owned by you" },
        { status: 404 },
      );
    }

    const draft = draftRows[0];

    // 2. Build patient data from draft + any override fields
    const patientData: Record<string, any> = {
      id: draft.id, // keep same UUID for continuity
      firstName: overrideFields.firstName ?? draft.firstName,
      lastName: overrideFields.lastName ?? draft.lastName,
      phone: overrideFields.phone ?? draft.phone,
      email: overrideFields.email ?? draft.email,
      dob: overrideFields.dob
        ? new Date(overrideFields.dob)
        : draft.dob,
      country: overrideFields.country ?? draft.country,
      city: overrideFields.city ?? draft.city,
      language: overrideFields.language ?? draft.language,
      chiefComplaint: overrideFields.chiefComplaint ?? draft.chiefComplaint,
      allergies: overrideFields.allergies ?? draft.allergies,
      currentMeds: overrideFields.currentMeds ?? draft.currentMeds,
      hospital: overrideFields.hospital ?? draft.hospital,
      missionId: overrideFields.missionId ?? draft.missionId,
      createdById: session.userId,
      status: overrideFields.status || "Pre-Op / Not Cleared",
      priority: overrideFields.priority || "Not Selected",
      createdAt: draft.createdAt, // preserve original creation time
      updatedAt: new Date(),
    };

    // Handle gender — draft stores as varchar, patients uses enum
    if (overrideFields.gender ?? draft.gender) {
      patientData.gender = overrideFields.gender ?? draft.gender;
    }

    // Handle specialty/specialties
    if (overrideFields.specialty) {
      patientData.specialties = [overrideFields.specialty];
    } else if (overrideFields.specialties) {
      patientData.specialties = overrideFields.specialties;
    } else if (draft.specialties) {
      patientData.specialties = draft.specialties;
    }

    // 3. Insert into patients table (use same UUID)
    const newPatient = await db
      .insert(patients)
      .values(patientData)
      .onConflictDoUpdate({
        target: patients.id,
        set: patientData,
      })
      .returning();

    // 4. Delete the draft
    await db
      .delete(patientDrafts)
      .where(eq(patientDrafts.id, draftId));

    return NextResponse.json({ data: newPatient[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[Error] Failed to publish draft:", error.message);
    return NextResponse.json(
      { error: `Failed to publish draft: ${error.message}` },
      { status: 500 },
    );
  }
}
