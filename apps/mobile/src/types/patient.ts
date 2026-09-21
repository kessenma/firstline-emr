// apps/mobile/src/types/patient.ts
// Type definitions for patient data in the mobile app
// Updated for PostgreSQL + PowerSync compatibility (Phase 2.1 & 2.3)

import type { Gender, PatientStatus, PatientPriority, AccountType } from './enums';
import type { Note } from './notes';
import type { CareTeamMemberJSON } from '@fajr/shared/care-team';

export interface User {
  id: string;  // UUID v4 (PostgreSQL primary key)
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;  // Updated enum reference
  gender?: Gender;          // Updated enum reference
  // PowerSync metadata fields
  powersync_id?: string;
  powersync_updated_at?: string;
}

export interface Patient {
  id: string;  // UUID v4 (PostgreSQL primary key)
  firstName?: string;
  lastName: string;
  dob?: string | Date;
  gender?: Gender;
  genderPreference?: Gender;
  phone?: {
    countryCode?: string;
    phoneNumber?: string;
  };
  email?: string;
  telegramChatId?: string;
  telegramAccessHash?: string;
  bmi?: string;
  city?: string;
  country?: string;
  language?: string;
  occupation?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  diagnosisCat?: string;
  icd10?: string;
  hospital?: string;
  priority?: PatientPriority;
  specialties?: string[];
  specialty?: string;
  status?: PatientStatus;
  baselineAmbu?: string;
  pmhx?: string;
  pshx?: string;
  famhx?: string;
  allergies?: string;
  currentMeds?: string;
  prevMeds?: string;
  smokeCount?: string;
  drinkCount?: string;
  otherDrugs?: string;
  dashboardNotes?: string;
  isPatient?: boolean;
  patientRelation?: string;
  previouslyRegistered?: string;
  scheduledVidChat?: string;
  surgeryDate?: string;
  hasSubmittedInfo?: boolean;
  createdById?: string;
  missionId?: string;
  // UUID foreign keys (PostgreSQL references)
  triaged_by_id?: string;
  doctor_id?: string;
  coordinator_id?: string;
  // Populated relations (for API responses with joined data)
  triagedBy?: User;
  doctor?: User;
  careTeam?: CareTeamMemberJSON[];
  coordinator?: User;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // Additional fields for patient chart
  notes?: Note[];
  photos?: { url: string; uploadedAt: Date }[];
  rxOrders?: import('@fajr/shared/patient').RxOrderBase[];
}

export interface PatientWithMessages extends Patient {
  unreadMessages: number;
}

export interface PatientFilters {
  status?: PatientStatus;
  priority?: PatientPriority;
  specialty?: string;
  search?: string;
  hospital?: string;
  missionIds?: string[];
}

export interface PatientListResponse {
  patients: PatientWithMessages[];
  total: number;
  page: number;
  limit: number;
}

export interface PatientUpdateParams {
  id: string;
  data: Partial<Patient>;
}

export type { CareTeamRole } from '@fajr/shared/care-team';
export type { CareTeamMember } from '@fajr/shared/patient';
export type { CareTeamConflict } from '@fajr/shared/patient';
export type { RxOrderBase as RxOrder } from '@fajr/shared/patient';
