// app/api/patient/unassigned-specialty/route.ts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { eq, and, ne, lt, desc } from "drizzle-orm";
import type { PatientFieldSelection } from "@/types/patient";

export async function GET(request: NextRequest) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve account type and user ID from the user object
    const { userId, accountType } = session;

    console.log(
      "[Debug] Fetching unassigned specialty patients for user:",
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

    // Build query - filter for patients with specialties but no doctors assigned
    // AND not discharged (status !== 'Post-Op / Discharged')
    const whereConditions = and(
      eq(patients.hasSpecialtyWithoutDoctors, true),
      ne(patients.status, "Post-Op / Discharged"),
      accountType === "Evac"
        ? eq(patients.coordinatorId, userId)
        : undefined,
    );

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
      hasSpecialtyWithoutDoctors: patients.hasSpecialtyWithoutDoctors,
      // Fields needed for dashboard table display
      dob: patients.dob,
      city: patients.city,
      country: patients.country,
      language: patients.language,
      chiefComplaint: patients.chiefComplaint,
      triagedBy: patients.triagedBy,
      genderPreference: patients.genderPreference,
      careTeam: patients.careTeam,
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
      hasSpecialtyWithoutDoctors: patients.hasSpecialtyWithoutDoctors,
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
    const unassignedPatients = await db
      .select(selectFields)
      .from(patients)
      .leftJoin(users, eq(patients.coordinatorId, users.id))
      .where(paginationConditions)
      .orderBy(desc(patients.createdAt))
      .limit(limit + 1);

    console.log(
      "[Debug] Unassigned specialty patients fetched from DB:",
      unassignedPatients.length,
      "with field mode:",
      fields,
    );

    // Check if there are more results
    const hasMore = unassignedPatients.length > limit;
    const results = hasMore
      ? unassignedPatients.slice(0, limit)
      : unassignedPatients;

    // Calculate next cursor from the last item
    const nextCursor =
      hasMore && results.length > 0
        ? results[results.length - 1].createdAt?.toISOString()
        : null;

    return NextResponse.json(
      {
        data: results,
        pagination: {
          nextCursor,
          hasMore,
          limit,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      "[Error] Failed to fetch unassigned specialty patients:",
      error.message,
    );
    return NextResponse.json(
      {
        error: `Failed to fetch unassigned specialty patients: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
