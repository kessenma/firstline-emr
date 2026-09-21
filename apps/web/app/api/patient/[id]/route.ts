// app/api/patient/[id]/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, users, rxOrders, patientMedia } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendPatientDeletionMessage } from "@/utils/telegram/sendPatientDeletionMessage";
import { recordPatientEditor } from "@/lib/server/ensureCareTeamMembership";
import { storageService } from "@/lib/storage";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const patientId = params.id;

    console.log(
      "[Debug] Received request to fetch patient with ID:",
      patientId,
    );

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Fetch patient with coordinator details
    const patient = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        email: patients.email,
        telegramChatId: patients.telegramChatId,
        telegramAccessHash: patients.telegramAccessHash,
        bmi: patients.bmi,
        dob: patients.dob,
        gender: patients.gender,
        country: patients.country,
        city: patients.city,
        language: patients.language,
        occupation: patients.occupation,
        chiefComplaint: patients.chiefComplaint,
        diagnosis: patients.diagnosis,
        diagnosisCat: patients.diagnosisCat,
        icd10: patients.icd10,
        hospital: patients.hospital,
        priority: patients.priority,
        specialties: patients.specialties,
        status: patients.status,
        baselineAmbu: patients.baselineAmbu,
        pmhx: patients.pmhx,
        pshx: patients.pshx,
        famhx: patients.famhx,
        allergies: patients.allergies,
        currentMeds: patients.currentMeds,
        prevMeds: patients.prevMeds,
        smokeCount: patients.smokeCount,
        drinkCount: patients.drinkCount,
        otherDrugs: patients.otherDrugs,
        coordinatorId: patients.coordinatorId,
        triagedBy: patients.triagedBy,
        careTeam: patients.careTeam,
        isPatient: patients.isPatient,
        patientRelation: patients.patientRelation,
        genderPreference: patients.genderPreference,
        previouslyRegistered: patients.previouslyRegistered,
        scheduledVidChat: patients.scheduledVidChat,
        surgeryDate: patients.surgeryDate,
        dashboardNotes: patients.dashboardNotes,
        hasSubmittedInfo: patients.hasSubmittedInfo,
        missionId: patients.missionId,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        // Include coordinator details
        coordinator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          accountType: users.accountType,
        },
      })
      .from(patients)
      .leftJoin(users, eq(patients.coordinatorId, users.id))
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      console.log("[Debug] No patient found with the provided ID.");
      return NextResponse.json({ error: "Patient Not Found" }, { status: 404 });
    }

    console.log(
      "[Debug] Patient found:",
      patient[0].firstName,
      patient[0].lastName,
    );

    // Fetch patient media. `id` is required by the client — without it the
    // gallery cannot address a single photo for deletion.
    const photos = await db
      .select({
        id: patientMedia.id,
        url: patientMedia.url,
        contentType: patientMedia.contentType,
        source: patientMedia.source,
        uploadedAt: patientMedia.uploadedAt,
      })
      .from(patientMedia)
      .where(eq(patientMedia.patientId, patientId));

    return NextResponse.json({ patient: { ...patient[0], photos } });
  } catch (error) {
    console.error("[Error] Error fetching patient:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const patientId = params.id;

    console.log("[Debug] PATCH request received for patient:", patientId);

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    const requestData = await request.json();
    console.log(
      "[Debug] Request payload:",
      JSON.stringify(requestData, null, 2),
    );

    // Destructure to check if it's an RX order update
    const { rxOrderId, updatedRxOrder, ...patientUpdateData } = requestData;

    if (rxOrderId && updatedRxOrder) {
      console.log("[Debug] RX order update detected.");
      console.log("[Debug] RX Order ID:", rxOrderId);
      console.log("[Debug] Updated RX Order Data:", updatedRxOrder);

      // **Validation for RX Order**
      if (!updatedRxOrder.rxDispenserName && !updatedRxOrder.RxDispenserName) {
        console.error("[Error] Validation failed: Missing RX Dispenser Name.");
        return NextResponse.json(
          { error: "RX dispenser name is required." },
          { status: 400 },
        );
      }

      // **Step 1: Find the RX order**
      const existingRxOrder = await db
        .select()
        .from(rxOrders)
        .where(
          and(
            eq(rxOrders.patientId, patientId),
            eq(rxOrders.rxOrderId, rxOrderId),
          ),
        )
        .limit(1);

      if (!existingRxOrder || existingRxOrder.length === 0) {
        console.error(
          `[Error] RX Order with ID ${rxOrderId} not found for patient ${patientId}.`,
        );
        return NextResponse.json(
          { error: "RX order not found." },
          { status: 404 },
        );
      }

      console.log("[Debug] Found RX order:", existingRxOrder[0].id);

      // **Step 2: Prepare the update fields**
      const updateFields: any = {
        updatedAt: new Date(),
      };

      if (updatedRxOrder.rxDispenserName || updatedRxOrder.RxDispenserName) {
        updateFields.rxDispenserName =
          updatedRxOrder.rxDispenserName || updatedRxOrder.RxDispenserName;
      }

      if (
        updatedRxOrder.rxDispenserContact ||
        updatedRxOrder.RxDispenserContact
      ) {
        updateFields.rxDispenserContact =
          updatedRxOrder.rxDispenserContact ||
          updatedRxOrder.RxDispenserContact;
      }

      if (updatedRxOrder.rxStatus) {
        updateFields.rxStatus = updatedRxOrder.rxStatus;
      }

      if (updatedRxOrder.submitted !== undefined) {
        updateFields.submitted = updatedRxOrder.submitted;
      }

      if (updatedRxOrder.partialRxNotes !== undefined) {
        updateFields.partialRxNotes = updatedRxOrder.partialRxNotes;
      }

      // **Step 3: Clear QR codes if submitted**
      if (updatedRxOrder.submitted) {
        console.log(
          "[Debug] RX order has been submitted. Removing Pharmacy QR Code and URL.",
        );
        updateFields.pharmacyQrCode = null;
        updateFields.pharmacyQrUrl = null;
      }

      // **Step 4: Apply the updates**
      const updated = await db
        .update(rxOrders)
        .set(updateFields)
        .where(eq(rxOrders.id, existingRxOrder[0].id))
        .returning();

      console.log("[Debug] RX order updated successfully:", updated[0].id);

      // Fetch updated patient with all details
      const updatedPatient = await db
        .select({
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          phone: patients.phone,
          email: patients.email,
          telegramChatId: patients.telegramChatId,
          telegramAccessHash: patients.telegramAccessHash,
          bmi: patients.bmi,
          dob: patients.dob,
          gender: patients.gender,
          country: patients.country,
          city: patients.city,
          language: patients.language,
          occupation: patients.occupation,
          chiefComplaint: patients.chiefComplaint,
          diagnosis: patients.diagnosis,
          diagnosisCat: patients.diagnosisCat,
          icd10: patients.icd10,
          hospital: patients.hospital,
          priority: patients.priority,
          specialties: patients.specialties,
          status: patients.status,
          baselineAmbu: patients.baselineAmbu,
          pmhx: patients.pmhx,
          pshx: patients.pshx,
          famhx: patients.famhx,
          allergies: patients.allergies,
          currentMeds: patients.currentMeds,
          prevMeds: patients.prevMeds,
          smokeCount: patients.smokeCount,
          drinkCount: patients.drinkCount,
          otherDrugs: patients.otherDrugs,
          coordinatorId: patients.coordinatorId,
          triagedBy: patients.triagedBy,
          careTeam: patients.careTeam,
          isPatient: patients.isPatient,
          patientRelation: patients.patientRelation,
          genderPreference: patients.genderPreference,
          previouslyRegistered: patients.previouslyRegistered,
          scheduledVidChat: patients.scheduledVidChat,
          surgeryDate: patients.surgeryDate,
          dashboardNotes: patients.dashboardNotes,
          hasSubmittedInfo: patients.hasSubmittedInfo,
          createdAt: patients.createdAt,
          updatedAt: patients.updatedAt,
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      return NextResponse.json(
        {
          message: "RX order updated successfully.",
          patient: updatedPatient[0],
        },
        { status: 200 },
      );
    } else {
      console.log(
        "[Debug] General patient update detected. Updating patient fields.",
      );

      // Check if patient exists
      const existingPatient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!existingPatient || existingPatient.length === 0) {
        console.error("[Error] Patient with ID", patientId, "not found.");
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 },
        );
      }

      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Map all possible fields from patientUpdateData
      const fieldMappings: { [key: string]: string } = {
        firstName: "firstName",
        lastName: "lastName",
        phone: "phone",
        email: "email",
        telegramChatId: "telegramChatId",
        telegramAccessHash: "telegramAccessHash",
        bmi: "bmi",
        dob: "dob",
        gender: "gender",
        country: "country",
        city: "city",
        language: "language",
        occupation: "occupation",
        chiefComplaint: "chiefComplaint",
        diagnosis: "diagnosis",
        diagnosisCat: "diagnosisCat",
        icd10: "icd10",
        hospital: "hospital",
        priority: "priority",
        specialties: "specialties",
        status: "status",
        baselineAmbu: "baselineAmbu",
        pmhx: "pmhx",
        pshx: "pshx",
        famhx: "famhx",
        allergies: "allergies",
        currentMeds: "currentMeds",
        prevMeds: "prevMeds",
        smokeCount: "smokeCount",
        drinkCount: "drinkCount",
        otherDrugs: "otherDrugs",
        coordinatorId: "coordinatorId",
        triagedBy: "triagedBy",
        careTeam: "careTeam",
        isPatient: "isPatient",
        patientRelation: "patientRelation",
        genderPreference: "genderPreference",
        previouslyRegistered: "previouslyRegistered",
        scheduledVidChat: "scheduledVidChat",
        surgeryDate: "surgeryDate",
        dashboardNotes: "dashboardNotes",
        hasSubmittedInfo: "hasSubmittedInfo",
        missionId: "missionId",
      };

      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (patientUpdateData[key] !== undefined) {
          // Handle date fields
          if (
            key === "dob" ||
            key === "scheduledVidChat" ||
            key === "surgeryDate"
          ) {
            updateData[dbField] = patientUpdateData[key]
              ? new Date(patientUpdateData[key])
              : null;
          } else {
            updateData[dbField] = patientUpdateData[key];
          }
        }
      }

      // Clear the unassigned-specialty flag when specialties are updated
      if (patientUpdateData.specialties !== undefined) {
        updateData.hasSpecialtyWithoutDoctors = false;
      }

      console.log(
        "[Debug] Fields to update:",
        JSON.stringify(updateData, null, 2),
      );

      // Perform update
      const updatedPatient = await db
        .update(patients)
        .set(updateData)
        .where(eq(patients.id, patientId))
        .returning();

      console.log(
        "[Debug] Patient updated successfully:",
        updatedPatient[0].id,
      );

      // Editing a patient records you on their care team (Triage/Coordinator
      // only). Non-fatal — the update above is already committed.
      await recordPatientEditor({
        patientId,
        userId: session.userId,
        accountType: session.accountType,
      });

      return NextResponse.json({ patient: updatedPatient[0] }, { status: 200 });
    }
  } catch (error) {
    console.error("[Error] Unexpected error while updating patient:", error);
    return NextResponse.json(
      { error: "Failed to update patient." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Valid patient ID is required" },
        { status: 400 },
      );
    }

    console.log("[Debug] DELETE request for patient:", id);

    // Find the patient first
    const existing = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        telegramChatId: patients.telegramChatId,
        language: patients.language,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      // Record doesn't exist — treat as success for idempotent PowerSync retries
      console.log("[Debug] Patient not found (already deleted?):", id);
      return NextResponse.json({ message: "Patient not found" }, { status: 200 });
    }

    const patient = existing[0];

    // Full cleanup (Telegram notification, media, etc.)
    if (patient.telegramChatId) {
      try {
        await sendPatientDeletionMessage(
          patient.telegramChatId,
          `${patient.firstName} ${patient.lastName}`,
          patient.language || "english",
        );
      } catch (telegramError) {
        console.error("[Warning] Failed to send Telegram deletion message:", telegramError);
      }

      const env = storageService.getEnvironmentPrefix();
      try {
        await Promise.all([
          storageService.deleteByPrefix(`${env}/telegram/photos/${patient.telegramChatId}`),
          storageService.deleteByPrefix(`${env}/telegram/audio/${patient.telegramChatId}`),
        ]);
      } catch (mediaError) {
        console.error("[Warning] Failed to delete telegram media:", mediaError);
      }
    }

    // Delete patient media from storage
    const env = storageService.getEnvironmentPrefix();
    try {
      await storageService.deleteByPrefix(`${env}/patient-media/${id}`);
      await storageService.deleteByPrefix(`${env}/patient-photos/${id}`);
    } catch (mediaError) {
      console.error("[Warning] Failed to delete patient media:", mediaError);
    }

    await db.delete(patients).where(eq(patients.id, id));
    console.log("[Debug] Patient deleted:", patient.firstName, patient.lastName);

    return NextResponse.json({
      message: `Patient ${patient.firstName} ${patient.lastName} deleted successfully`,
    });
  } catch (error: any) {
    console.error("[Error] Failed to delete patient:", error.message);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 },
    );
  }
}
