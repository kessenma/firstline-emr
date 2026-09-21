// apps/web/types/patient.ts
/**
 * Patient type definitions for optimized data fetching
 *
 * - PatientListItem: Minimal data for list/dashboard views (20-30% smaller payload)
 * - PatientDetail: Full patient data for detail views
 */

/**
 * Minimal patient data for list views (dashboard, tables)
 * Only includes fields necessary for displaying patient lists
 */
export type PatientListItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone?: {
    countryCode: string;
    phoneNumber: string;
  } | null;
  telegramChatId: string | null;
  status: string;
  priority: string;
  hospital: string;
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
  triagedBy?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  genderPreference: string | null;
  careTeam?: { userId: string; firstName: string; lastName: string; email: string; role: string; isLead: boolean }[] | null;
  // Coordinator info for display
  coordinator?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    accountType: string | null;
  } | null;
  // For unread message count (added client-side)
  unreadMessages?: number;
};

/**
 * Full patient data for detail views (patient profile, edit forms)
 * Includes all patient fields
 */
export type PatientDetail = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone?: {
    countryCode: string;
    phoneNumber: string;
  } | null;
  email: string | null;
  telegramChatId: string | null;
  telegramAccessHash: string | null;
  bmi: string | null;
  dob: Date | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
  occupation: string | null;
  chiefComplaint: string | null;
  diagnosis: string | null;
  diagnosisCat: string | null;
  icd10: string | null;
  hospital: string;
  priority: string;
  specialties: string[] | null;
  status: string;
  baselineAmbu: string | null;
  pmhx: string | null;
  pshx: string | null;
  famhx: string | null;
  allergies: string | null;
  currentMeds: string | null;
  prevMeds: string | null;
  smokeCount: string | null;
  drinkCount: string | null;
  otherDrugs: string | null;
  coordinatorId: string | null;
  triagedBy?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  careTeam?: { userId: string; firstName: string; lastName: string; email: string; role: string; isLead: boolean }[] | null;
  isPatient: boolean | null;
  patientRelation: string | null;
  genderPreference: string | null;
  previouslyRegistered: string | null;
  scheduledVidChat: Date | null;
  surgeryDate: Date | null;
  dashboardNotes: string | null;
  hasSubmittedInfo: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  coordinator?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    accountType: string | null;
  } | null;
  // For unread message count (added client-side)
  unreadMessages?: number;
};

/**
 * Helper type for API responses that include unread messages
 */
export type PatientWithMessages<T = PatientListItem> = T & {
  unreadMessages: number;
};

/**
 * Field selection option for API queries
 */
export type PatientFieldSelection = "minimal" | "full";
