// apps/web/lib/server/patients.ts
// Server-side patient fetching utility for server components
// Uses direct database access instead of API routes for better performance

import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBatchUnreadCounts } from "@/lib/telegram-db-helpers";
import type { CareTeamMemberJSON } from "@fajr/shared/care-team";

export type ServerPatient = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: {
    countryCode: string;
    phoneNumber: string;
  } | null;
  telegramChatId: string | null;
  status: string | null;
  priority: string | null;
  hospital: string | null;
  specialties: string[] | null;
  createdAt: Date;
  coordinatorId: string | null;
  dashboardNotes: string | null;
  scheduledVidChat: Date | null;
  // Fields needed for dashboard table display
  dob: Date | null;
  city: string | null;
  country: string | null;
  language: string | null;
  chiefComplaint: string | null;
  triagedBy: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  genderPreference: string | null;
  careTeam: CareTeamMemberJSON[] | null;
  coordinator: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    accountType: string | null;
  } | null;
  unreadMessages: number;
};

/**
 * Fetches active patients with unread message counts on the server side
 * Uses direct database queries for optimal performance in server components
 */
export async function fetchActivePatientsWithMessages(): Promise<
  ServerPatient[]
> {
  try {
    console.log("[Server] Fetching active patients with messages");

    // Get session to determine user permissions
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.accountType) {
      console.error("[Server] No valid session found");
      return [];
    }

    const { id: userId, accountType } = session.user;

    // Build query - exclude discharged patients
    const whereConditions = ne(patients.status, "Post-Op / Discharged");

    // Fetch patients directly from database
    const patientsList = await db
      .select({
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
      .where(whereConditions);

    console.log(
      `[Server] Fetched ${patientsList.length} active patients from database`,
    );

    // Get unread message counts for all patients with Telegram in a single batch query
    const chatIds = patientsList
      .filter((patient) => patient.telegramChatId)
      .map((patient) => patient.telegramChatId as string);

    console.log(
      `[Server] Fetching unread counts for ${chatIds.length} patients in batch`,
    );

    const unreadMessagesMap =
      chatIds.length > 0 ? await getBatchUnreadCounts(chatIds) : {};

    // Map unread counts to patients and sanitize data for serialization
    const patientsWithMessages: ServerPatient[] = patientsList.map(
      (patient) => {
        // Sanitize phone field - ensure it's either null or a proper object
        let sanitizedPhone = patient.phone;
        if (patient.phone && typeof patient.phone === "string") {
          // If phone is stored as a string (malformed), set to null
          sanitizedPhone = null;
        } else if (patient.phone && typeof patient.phone === "object") {
          // Ensure it has the correct shape
          const phoneObj = patient.phone as any;
          if (
            !phoneObj.countryCode ||
            !phoneObj.phoneNumber ||
            phoneObj.countryCode.trim() === "" ||
            phoneObj.phoneNumber.trim() === ""
          ) {
            sanitizedPhone = null;
          }
        }

        // Sanitize triagedBy field
        let sanitizedTriagedBy = patient.triagedBy;
        if (patient.triagedBy && typeof patient.triagedBy !== "object") {
          sanitizedTriagedBy = null;
        }

        // Sanitize careTeam field
        let sanitizedCareTeam = patient.careTeam;
        if (patient.careTeam && !Array.isArray(patient.careTeam)) {
          sanitizedCareTeam = null;
        }

        // Sanitize specialties array field
        let sanitizedSpecialties = patient.specialties;
        if (patient.specialties && !Array.isArray(patient.specialties)) {
          // If specialties is not an array (malformed), set to null
          sanitizedSpecialties = null;
        } else if (
          patient.specialties &&
          !patient.specialties.every((s) => typeof s === "string")
        ) {
          // If specialties contains non-string values, filter them out
          sanitizedSpecialties = patient.specialties.filter(
            (s) => typeof s === "string",
          );
        }

        return {
          ...patient,
          phone: sanitizedPhone,
          triagedBy: sanitizedTriagedBy,
          careTeam: sanitizedCareTeam,
          specialties: sanitizedSpecialties,
          unreadMessages: patient.telegramChatId
            ? unreadMessagesMap[patient.telegramChatId] || 0
            : 0,
        };
      },
    );

    console.log(
      `[Server] Successfully enriched ${patientsWithMessages.length} patients with unread counts`,
    );

    return patientsWithMessages;
  } catch (error) {
    console.error(
      "[Server] Error fetching active patients with messages:",
      error,
    );
    // Return empty array on error to prevent server component failures
    return [];
  }
}

/**
 * Fetches archived patients with unread message counts on the server side
 * Uses direct database queries for optimal performance in server components
 */
export async function fetchArchivedPatientsWithMessages(): Promise<
  ServerPatient[]
> {
  try {
    console.log("[Server] Fetching archived patients with messages");

    // Get session to determine user permissions
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.accountType) {
      console.error("[Server] No valid session found");
      return [];
    }

    const { id: userId, accountType } = session.user;

    // Build query - only discharged patients
    const whereConditions = eq(patients.status, "Post-Op / Discharged");

    // Fetch patients directly from database
    const patientsList = await db
      .select({
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
      .where(whereConditions);

    console.log(
      `[Server] Fetched ${patientsList.length} archived patients from database`,
    );

    // Get unread message counts for all patients with Telegram in a single batch query
    const chatIds = patientsList
      .filter((patient) => patient.telegramChatId)
      .map((patient) => patient.telegramChatId as string);

    console.log(
      `[Server] Fetching unread counts for ${chatIds.length} patients in batch`,
    );

    const unreadMessagesMap =
      chatIds.length > 0 ? await getBatchUnreadCounts(chatIds) : {};

    // Map unread counts to patients and sanitize data for serialization
    const patientsWithMessages: ServerPatient[] = patientsList.map(
      (patient) => {
        // Sanitize phone field - ensure it's either null or a proper object
        let sanitizedPhone = patient.phone;
        if (patient.phone && typeof patient.phone === "string") {
          // If phone is stored as a string (malformed), set to null
          sanitizedPhone = null;
        } else if (patient.phone && typeof patient.phone === "object") {
          // Ensure it has the correct shape
          const phoneObj = patient.phone as any;
          if (
            !phoneObj.countryCode ||
            !phoneObj.phoneNumber ||
            phoneObj.countryCode.trim() === "" ||
            phoneObj.phoneNumber.trim() === ""
          ) {
            sanitizedPhone = null;
          }
        }

        // Sanitize triagedBy field
        let sanitizedTriagedBy = patient.triagedBy;
        if (patient.triagedBy && typeof patient.triagedBy !== "object") {
          sanitizedTriagedBy = null;
        }

        // Sanitize careTeam field
        let sanitizedCareTeam = patient.careTeam;
        if (patient.careTeam && !Array.isArray(patient.careTeam)) {
          sanitizedCareTeam = null;
        }

        // Sanitize specialties array field
        let sanitizedSpecialties = patient.specialties;
        if (patient.specialties && !Array.isArray(patient.specialties)) {
          // If specialties is not an array (malformed), set to null
          sanitizedSpecialties = null;
        } else if (
          patient.specialties &&
          !patient.specialties.every((s) => typeof s === "string")
        ) {
          // If specialties contains non-string values, filter them out
          sanitizedSpecialties = patient.specialties.filter(
            (s) => typeof s === "string",
          );
        }

        return {
          ...patient,
          phone: sanitizedPhone,
          triagedBy: sanitizedTriagedBy,
          careTeam: sanitizedCareTeam,
          specialties: sanitizedSpecialties,
          unreadMessages: patient.telegramChatId
            ? unreadMessagesMap[patient.telegramChatId] || 0
            : 0,
        };
      },
    );

    console.log(
      `[Server] Successfully enriched ${patientsWithMessages.length} archived patients with unread counts`,
    );

    return patientsWithMessages;
  } catch (error) {
    console.error(
      "[Server] Error fetching archived patients with messages:",
      error,
    );
    // Return empty array on error to prevent server component failures
    return [];
  }
}

/**
 * Fetches both active and archived patients with unread message counts in parallel
 * Uses direct database queries for optimal performance in server components
 */
export async function fetchAllPatientsWithMessages(): Promise<{
  active: ServerPatient[];
  archived: ServerPatient[];
}> {
  try {
    console.log(
      "[Server] Fetching all patients (active and archived) in parallel",
    );

    const [active, archived] = await Promise.all([
      fetchActivePatientsWithMessages(),
      fetchArchivedPatientsWithMessages(),
    ]);

    console.log(
      `[Server] Fetched ${active.length} active and ${archived.length} archived patients`,
    );

    return { active, archived };
  } catch (error) {
    console.error("[Server] Error fetching all patients with messages:", error);
    return { active: [], archived: [] };
  }
}
