// app/api/patient/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, users, telegramThreads } from "@/db/schema";
import { eq, and, ne, lt, desc, sql } from "drizzle-orm";
import type { PatientFieldSelection } from "@/types/patient";
import { PatientStatusList } from "@/data/patientStatus.enum";
import { getActiveIntakeMission } from "@/lib/missions/getActiveIntakeMission";
import { notificationService } from "@/lib/NotificationService";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve account type and user ID from the session object
    const { userId, accountType } = session;

    console.log(
      "[Debug] Fetching patients for user:",
      userId,
      "accountType:",
      accountType,
    );

    // Support field selection and pagination via query params
    const { searchParams } = new URL(request.url);
    const fields = (searchParams.get("fields") ||
      "minimal") as PatientFieldSelection;

    // Cursor-based pagination parameters
    const cursor = searchParams.get("cursor"); // ISO timestamp of last patient's createdAt
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    console.log(
      "[Debug] Field selection mode:",
      fields,
      "Cursor:",
      cursor,
      "Limit:",
      limit,
    );

    // `scope=all` powers the "All Patients" view: active AND discharged from a
    // single cursor, so it paginates coherently. Default excludes discharged.
    const includeDischarged = searchParams.get("scope") === "all";
    const notDischarged = includeDischarged
      ? undefined
      : ne(patients.status, PatientStatusList.POST_OP_DISCHARGED);

    const whereConditions =
      accountType === "Evac"
        ? and(notDischarged, eq(patients.coordinatorId, userId))
        : notDischarged;

    // Add cursor condition if provided
    const paginationConditions = cursor
      ? and(whereConditions, lt(patients.createdAt, new Date(cursor)))
      : whereConditions;

    // Define minimal field set for list views (dashboard)
    const minimalFields = {
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      phone: patients.phone,
      telegramChatId: patients.telegramChatId,
      status: patients.status,
      priority: patients.priority,
      hospital: patients.hospital,
      specialties: patients.specialties,
      createdAt: patients.createdAt,
      coordinatorId: patients.coordinatorId,
      dashboardNotes: patients.dashboardNotes,
      scheduledVidChat: patients.scheduledVidChat,
      // Fields needed for dashboard table display
      dob: patients.dob,
      city: patients.city,
      country: patients.country,
      language: patients.language,
      chiefComplaint: patients.chiefComplaint,
      triagedBy: patients.triagedBy,
      genderPreference: patients.genderPreference,
      careTeam: patients.careTeam,
      missionId: patients.missionId,
      // Include coordinator details
      coordinator: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
      },
    };

    // Define full field set for detail views
    const fullFields = {
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
      // Include coordinator details
      coordinator: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
      },
    };

    // Select appropriate field set based on query parameter
    const selectFields = fields === "minimal" ? minimalFields : fullFields;

    // Fetch limit + 1 to determine if there are more results
    const patientsList = await db
      .select(selectFields)
      .from(patients)
      .leftJoin(users, eq(patients.coordinatorId, users.id))
      .where(paginationConditions)
      .orderBy(desc(patients.createdAt))
      .limit(limit + 1);

    console.log(
      "[Debug] Patients fetched from DB:",
      patientsList.length,
      "with field mode:",
      fields,
    );

    // Check if there are more results
    const hasMore = patientsList.length > limit;
    const results = hasMore ? patientsList.slice(0, limit) : patientsList;

    // Sanitize careTeam field — JSON columns may come back as strings instead of arrays
    const sanitizedResults = results.map((patient: any) => ({
      ...patient,
      careTeam: Array.isArray(patient.careTeam) ? patient.careTeam : [],
    }));

    // Calculate next cursor from the last item
    const nextCursor =
      hasMore && results.length > 0
        ? results[results.length - 1].createdAt?.toISOString()
        : null;

    return NextResponse.json(
      {
        data: sanitizedResults,
        pagination: {
          nextCursor,
          hasMore,
          limit,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Error] Failed to fetch all patients:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch all patients: ${error.message}` },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    console.log(
      "[Debug] Incoming PATCH payload:",
      JSON.stringify(payload, null, 2),
    );

    const {
      id, // PostgreSQL field
      firstName,
      lastName,
      phone,
      telegramAccessHash,
      telegramChatId,
      dob,
      country,
      city,
      language,
      genderPreference,
      chiefComplaint,
      email,
      priority,
      specialty,
      specialties,
      hospital,
      assignedDocId,
      coordinatorId,
      status,
      triagedBy,
      notes,
      dashboardNotes,
      gender,
      bmi,
      occupation,
      diagnosis,
      diagnosisCat,
      icd10,
      baselineAmbu,
      pmhx,
      pshx,
      famhx,
      allergies,
      currentMeds,
      prevMeds,
      smokeCount,
      drinkCount,
      otherDrugs,
      isPatient,
      patientRelation,
      previouslyRegistered,
      scheduledVidChat,
      surgeryDate,
      hasSubmittedInfo,
      missionId,
    } = payload;

    // Require PostgreSQL id only
    const patientId = id;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    console.log("[Debug] Looking for patient with ID:", patientId);

    // Check if patient exists
    const existingPatient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!existingPatient || existingPatient.length === 0) {
      console.error("[Error] Patient not found:", patientId);
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    console.log(
      "[Debug] Existing patient found:",
      existingPatient[0].firstName,
      existingPatient[0].lastName,
    );

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Update fields conditionally
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (telegramAccessHash !== undefined)
      updateData.telegramAccessHash = telegramAccessHash;
    if (telegramChatId !== undefined)
      updateData.telegramChatId = telegramChatId;
    if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
    if (country !== undefined) updateData.country = country;
    if (city !== undefined) updateData.city = city;
    if (language !== undefined) updateData.language = language;
    if (genderPreference !== undefined)
      updateData.genderPreference = genderPreference;
    if (chiefComplaint !== undefined)
      updateData.chiefComplaint = chiefComplaint;
    if (email !== undefined) updateData.email = email;
    if (priority !== undefined) updateData.priority = priority;
    if (hospital !== undefined) updateData.hospital = hospital;
    if (status !== undefined) updateData.status = status;
    if (triagedBy !== undefined) updateData.triagedBy = triagedBy;
    if (dashboardNotes !== undefined)
      updateData.dashboardNotes = dashboardNotes;
    if (gender !== undefined) updateData.gender = gender;
    if (bmi !== undefined) updateData.bmi = bmi;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (diagnosisCat !== undefined) updateData.diagnosisCat = diagnosisCat;
    if (icd10 !== undefined) updateData.icd10 = icd10;
    if (baselineAmbu !== undefined) updateData.baselineAmbu = baselineAmbu;
    if (pmhx !== undefined) updateData.pmhx = pmhx;
    if (pshx !== undefined) updateData.pshx = pshx;
    if (famhx !== undefined) updateData.famhx = famhx;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (currentMeds !== undefined) updateData.currentMeds = currentMeds;
    if (prevMeds !== undefined) updateData.prevMeds = prevMeds;
    if (smokeCount !== undefined) updateData.smokeCount = smokeCount;
    if (drinkCount !== undefined) updateData.drinkCount = drinkCount;
    if (otherDrugs !== undefined) updateData.otherDrugs = otherDrugs;
    if (isPatient !== undefined) updateData.isPatient = isPatient;
    if (patientRelation !== undefined)
      updateData.patientRelation = patientRelation;
    if (previouslyRegistered !== undefined)
      updateData.previouslyRegistered = previouslyRegistered;
    if (scheduledVidChat !== undefined)
      updateData.scheduledVidChat = scheduledVidChat
        ? new Date(scheduledVidChat)
        : null;
    if (surgeryDate !== undefined)
      updateData.surgeryDate = surgeryDate ? new Date(surgeryDate) : null;
    if (hasSubmittedInfo !== undefined)
      updateData.hasSubmittedInfo = hasSubmittedInfo;
    if (missionId !== undefined)
      updateData.missionId = missionId === null ? null : missionId;
    // Handle specialty/specialties
    if (specialty !== undefined) {
      updateData.specialties = [specialty];
    } else if (specialties !== undefined) {
      updateData.specialties = specialties;
    }

    // Handle coordinator assignment
    if (coordinatorId !== undefined) {
      if (coordinatorId === "unassign" || coordinatorId === null) {
        updateData.coordinatorId = null;
      } else if (UUID_REGEX.test(coordinatorId)) {
        updateData.coordinatorId = coordinatorId;
      }
    }

    console.log("[Debug] Update data:", JSON.stringify(updateData, null, 2));

    // Perform update
    const updatedPatient = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId))
      .returning();

    console.log("[Debug] Patient successfully updated:", updatedPatient[0].id);

    // Fetch updated patient with coordinator info
    const patientWithCoordinator = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        email: patients.email,
        telegramChatId:
          sql<string | null>`coalesce(${patients.telegramChatId}, ${telegramThreads.chatId})`.as(
            "telegram_chat_id",
          ),
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

    const result = patientWithCoordinator[0];
    return NextResponse.json({
      ...result,
      careTeam: Array.isArray(result.careTeam) ? result.careTeam : [],
    }, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Error updating patient:", error.message);
    return NextResponse.json(
      { error: `Error Updating Patient: ${error.message}` },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    console.log(
      "[Debug] Incoming POST payload:",
      JSON.stringify(payload, null, 2),
    );

    const {
      id, // client-provided UUID (e.g. from PowerSync offline create)
      firstName,
      lastName,
      dob,
      language,
      chiefComplaint,
      city,
      country,
      priority,
      specialty,
      specialties,
      status,
      coordinatorId, // Evac users' ID
      assignedDocId, // Doctors' ID (not used in current schema)
      phone,
      email,
      telegramChatId,
      telegramAccessHash,
      gender,
      bmi,
      occupation,
      diagnosis,
      diagnosisCat,
      icd10,
      hospital,
      missionId,
      baselineAmbu,
      genderPreference,
      isPatient,
      patientRelation,
      previouslyRegistered,
      dashboardNotes,
      allergies,
      currentMeds,
    } = payload;

    // Build patient data
    const patientData: any = {
      firstName,
      lastName,
      dob: dob ? new Date(dob) : null,
      language,
      chiefComplaint,
      city,
      country,
      priority: priority || "Not Selected",
      status: status || PatientStatusList.PRE_OP_NOT_CLEARED,
      hospital: hospital || null,
      createdById: session.userId, // audit trail: who created this patient
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use client-provided ID if valid (e.g. from PowerSync offline create)
    if (id && UUID_REGEX.test(id)) {
      patientData.id = id;
    }

    // Add optional fields
    if (phone !== undefined) patientData.phone = phone;
    if (email !== undefined) patientData.email = email;
    if (telegramChatId !== undefined)
      patientData.telegramChatId = telegramChatId;
    if (telegramAccessHash !== undefined)
      patientData.telegramAccessHash = telegramAccessHash;
    if (gender !== undefined) patientData.gender = gender;
    if (bmi !== undefined) patientData.bmi = bmi;
    if (occupation !== undefined) patientData.occupation = occupation;
    if (diagnosis !== undefined) patientData.diagnosis = diagnosis;
    if (diagnosisCat !== undefined) patientData.diagnosisCat = diagnosisCat;
    if (icd10 !== undefined) patientData.icd10 = icd10;
    if (baselineAmbu !== undefined) patientData.baselineAmbu = baselineAmbu;
    if (genderPreference !== undefined)
      patientData.genderPreference = genderPreference;
    if (isPatient !== undefined) patientData.isPatient = isPatient;
    if (patientRelation !== undefined)
      patientData.patientRelation = patientRelation;
    if (previouslyRegistered !== undefined)
      patientData.previouslyRegistered = previouslyRegistered;
    if (dashboardNotes !== undefined)
      patientData.dashboardNotes = dashboardNotes;
    if (allergies !== undefined) patientData.allergies = allergies;
    if (currentMeds !== undefined) patientData.currentMeds = currentMeds;

    // Handle specialty/specialties array
    if (specialty) {
      patientData.specialties = [specialty];
    } else if (specialties) {
      patientData.specialties = specialties;
    }

    // Handle coordinator assignment
    if (coordinatorId && UUID_REGEX.test(coordinatorId)) {
      patientData.coordinatorId = coordinatorId;
    }

    // Assign mission: respect client-provided missionId, fall back to active intake
    if (missionId) {
      patientData.missionId = missionId;
    } else {
      const activeMission = await getActiveIntakeMission();
      if (activeMission) {
        patientData.missionId = activeMission.id;
        if (!patientData.hospital && activeMission.defaultIntakeHospital) {
          patientData.hospital = activeMission.defaultIntakeHospital;
        }
      }
    }

    console.log(
      "[Debug] Creating patient with data:",
      JSON.stringify(patientData, null, 2),
    );

    // Create new patient (onConflictDoUpdate makes PowerSync retries idempotent)
    const { id: _excludeId, ...upsertFields } = patientData;
    const newPatient = await db
      .insert(patients)
      .values(patientData)
      .onConflictDoUpdate({
        target: patients.id,
        set: upsertFields,
      })
      .returning();

    console.log("[Debug] New patient created:", newPatient[0].id);

    // Notify triage users about new patient (fire-and-forget)
    const patientName =
      [firstName, lastName].filter(Boolean).join(" ") || "New patient";
    notificationService
      .sendToAccountType({
        type: "patient_update",
        category: "patient_action",
        message: `New patient created: ${patientName}`,
        accountType: "Triage",
        title: "New Patient",
        patientId: newPatient[0].id,
        redirectTo: `/patient/${newPatient[0].id}`,
        authorizedOnly: false,
      })
      .catch((err) =>
        console.error("Failed to send new patient notification:", err),
      );

    return NextResponse.json(
      {
        message: "Patient created successfully!",
        patient: newPatient[0],
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[Error] Failed to create patient:", error.message, error.detail || "", error.code || "");
    return NextResponse.json(
      { message: "Failed to create patient.", error: error.message },
      { status: 500 },
    );
  }
}
