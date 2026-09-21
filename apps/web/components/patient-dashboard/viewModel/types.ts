// apps/web/components/patient-dashboard/viewModel/types.tsx
import type { Patient } from "@/db/schema/patients";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";

// Common types used across the view model
export type PatientWithMessages = Patient & {
  unreadMessages: number;
};

export type ArchiveFilterType =
  | "active"
  | "discharged"
  | "both"
  | "followups"
  | "unassigned";

export type LoadingStates = Record<string, string | boolean>;

export interface SpecialtyChangeParams {
  patientId: string;
  specialty: DoctorSpecialtyList;
}

export interface StatusChangeParams {
  id: string;
  data: any;
}
