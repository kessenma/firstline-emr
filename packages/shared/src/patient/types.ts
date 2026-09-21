import type { CareTeamRole } from '../care-team/types';

export interface CareTeamMember {
  id: string;
  patientId: string;
  userId: string;
  role: CareTeamRole;
  isLead: boolean;
  assignedAt: string;
  assignedBy?: string;
  removedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  userAccountType?: string;
}

export interface CareTeamConflict {
  id: string;
  patientId: string;
  conflictingUserIds: string[];
  status: 'unresolved' | 'resolved';
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
}

// Medication order shapes live in `@fajr/shared/medications` — the single
// definition shared by web, mobile and the API routes. These aliases keep the
// older `@fajr/shared/patient` import path working.
export type {
  Medication,
  Prescription,
  RxOrder as RxOrderBase,
  MedOrder as MedOrderBase,
} from '../medications';
