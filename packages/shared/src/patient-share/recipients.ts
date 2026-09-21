import type { DirectoryUser } from '../calls/types';
import { hasSpecialtyOverlap } from '../care-team/chart-access';

/**
 * Recipient tabs for "send this patient to…".
 *
 * The tab set and the predicates are shared; the modal/sheet itself is written
 * twice, because `packages/shared` carries no React components (web imports
 * lucide-react, mobile lucide-react-native, and the two are incompatible).
 * Icons are named here and resolved per platform, the same way
 * `theme/role-icons.ts` does it.
 */

export type RecipientTabId = 'triage' | 'doctors' | 'specialty';

export interface RecipientTab {
  id: RecipientTabId;
  label: string;
  /** Resolved per platform via each app's AccountTypeIcon / RoleIcon. */
  iconName: 'Users' | 'Stethoscope';
  /** The specialty tab is unusable until the patient has a specialty. */
  disabled: boolean;
  /** Shown when disabled, to explain why. */
  disabledReason?: string;
}

/** `missions` is needed for the "Doctors on this mission" tab. */
export interface RecipientUser extends DirectoryUser {
  missions?: string[] | null;
}

export function getRecipientTabs(
  patientSpecialty?: string | null,
): RecipientTab[] {
  const specialty = patientSpecialty?.trim();
  return [
    { id: 'triage', label: 'Triage', iconName: 'Users', disabled: false },
    { id: 'doctors', label: 'Doctors', iconName: 'Stethoscope', disabled: false },
    {
      // Labelled with the specialty itself once assigned, so the tab says what
      // it will actually show.
      id: 'specialty',
      label: specialty || 'Specialty',
      iconName: 'Stethoscope',
      disabled: !specialty,
      disabledReason: specialty
        ? undefined
        : 'This patient has no specialty assigned yet.',
    },
  ];
}

/** The patient's primary specialty — the one the specialty tab filters on. */
export function getPrimarySpecialty(
  specialties?: string[] | null,
): string | null {
  if (!Array.isArray(specialties)) return null;
  const first = specialties.find(
    (s) => typeof s === 'string' && s.trim().length > 0,
  );
  return first ? first.trim() : null;
}

export function isTriageRecipient(user: RecipientUser): boolean {
  return user.accountType === 'Triage';
}

export function isDoctorOnMission(
  user: RecipientUser,
  missionId?: string | null,
): boolean {
  if (user.accountType !== 'Doctor') return false;
  // With no mission on the patient, fall back to all doctors rather than none —
  // an empty tab would read as "there are no doctors".
  if (!missionId) return true;
  return Array.isArray(user.missions) && user.missions.includes(missionId);
}

export function isDoctorWithSpecialty(
  user: RecipientUser,
  specialty?: string | null,
): boolean {
  if (user.accountType !== 'Doctor' || !specialty) return false;
  return hasSpecialtyOverlap([specialty], user.doctorSpecialty);
}

export function filterRecipients(
  users: RecipientUser[],
  tab: RecipientTabId,
  opts: { missionId?: string | null; specialty?: string | null } = {},
): RecipientUser[] {
  switch (tab) {
    case 'triage':
      return users.filter(isTriageRecipient);
    case 'doctors':
      return users.filter((u) => isDoctorOnMission(u, opts.missionId));
    case 'specialty':
      return users.filter((u) => isDoctorWithSpecialty(u, opts.specialty));
    default:
      return users;
  }
}
