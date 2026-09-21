import type { CareTeamRole } from './types';

/**
 * Who may open a patient chart.
 *
 * Patients are NOT hidden from the dashboard — everyone sees every patient on
 * their mission. Specialty is enforced here, at the point of opening a chart,
 * because hiding rows made patients a doctor had just created invisible to them
 * (a freshly created patient has no `triagedBy` and no specialty yet).
 *
 * Triage keeps mission-wide chart access and is never prompted; their access is
 * recorded instead by `ensureCareTeamMembership` when they edit a patient.
 */
export type ChartAccessReason =
  | 'allowed-non-doctor'
  | 'allowed-care-team'
  | 'allowed-specialty-match'
  | 'specialty-mismatch';

export interface ChartAccessResult {
  allowed: boolean;
  reason: ChartAccessReason;
  /** User-facing explanation. Null when access is allowed. */
  message: string | null;
}

/** Care-team member shape as it appears in `patients.careTeam` JSON, loosely
 *  typed because web matches on email and mobile matches on userId. */
export interface ChartAccessCareTeamMember {
  userId?: string | null;
  email?: string | null;
  userEmail?: string | null;
  role?: CareTeamRole | string | null;
  isLead?: boolean | null;
}

export interface ChartAccessPatient {
  specialties?: string[] | null;
  careTeam?: ChartAccessCareTeamMember[] | null;
}

export interface ChartAccessParams {
  accountType?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  doctorSpecialties?: string[] | null;
  patient: ChartAccessPatient;
}

const SPECIALTY_MISMATCH_MESSAGE =
  'This patient is not assigned to your specialty. Join their care team to open the chart.';

/**
 * Both platforms must agree on membership even though they historically matched
 * on different fields — web on `email`, mobile on `userId`.
 */
export function isCareTeamMember(
  careTeam: ChartAccessCareTeamMember[] | null | undefined,
  userId?: string | null,
  userEmail?: string | null,
): boolean {
  if (!Array.isArray(careTeam)) return false;
  const email = userEmail?.trim().toLowerCase() || null;
  return careTeam.some((member) => {
    if (!member) return false;
    if (userId && member.userId && String(member.userId) === String(userId)) {
      return true;
    }
    if (!email) return false;
    const memberEmail = (member.email ?? member.userEmail)?.trim().toLowerCase();
    return !!memberEmail && memberEmail === email;
  });
}

/** Defensive on both sides — `patients.specialties` is known to contain
 *  malformed values, and mobile stores specialties as JSON-in-text. */
export function hasSpecialtyOverlap(
  patientSpecialties: string[] | null | undefined,
  doctorSpecialties: string[] | null | undefined,
): boolean {
  if (!Array.isArray(patientSpecialties) || !Array.isArray(doctorSpecialties)) {
    return false;
  }
  const mine = new Set(
    doctorSpecialties
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  if (mine.size === 0) return false;
  return patientSpecialties.some(
    (s) => typeof s === 'string' && mine.has(s.trim().toLowerCase()),
  );
}

export function evaluateChartAccess(params: ChartAccessParams): ChartAccessResult {
  const { accountType, userId, userEmail, doctorSpecialties, patient } = params;

  // Triage, Admin, Coordinator, Evac: mission-wide chart access, no prompt.
  if (accountType !== 'Doctor') {
    return { allowed: true, reason: 'allowed-non-doctor', message: null };
  }

  if (isCareTeamMember(patient.careTeam, userId, userEmail)) {
    return { allowed: true, reason: 'allowed-care-team', message: null };
  }

  if (hasSpecialtyOverlap(patient.specialties, doctorSpecialties)) {
    return { allowed: true, reason: 'allowed-specialty-match', message: null };
  }

  return {
    allowed: false,
    reason: 'specialty-mismatch',
    message: SPECIALTY_MISMATCH_MESSAGE,
  };
}
