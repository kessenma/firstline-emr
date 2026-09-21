// ─── Patient Status ─────────────────────────────────────────────────────────

export type PatientStatus =
  | 'Pre-Op / Not Cleared'
  | 'Pre-Op / Cleared'
  | 'Peri-Op / In Surgery'
  | 'Post-Op / In-Patient'
  | 'Post-Op / Discharged';

export const PATIENT_STATUS_VALUES: readonly PatientStatus[] = [
  'Pre-Op / Not Cleared',
  'Pre-Op / Cleared',
  'Peri-Op / In Surgery',
  'Post-Op / In-Patient',
  'Post-Op / Discharged',
] as const;

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  'Pre-Op / Not Cleared': 'Pre-Op / Not Cleared',
  'Pre-Op / Cleared': 'Pre-Op / Cleared',
  'Peri-Op / In Surgery': 'Peri-Op / In Surgery',
  'Post-Op / In-Patient': 'Post-Op / In-Patient',
  'Post-Op / Discharged': 'Post-Op / Discharged',
} as const;

export const PATIENT_STATUS_COLORS: Record<PatientStatus, string> = {
  'Pre-Op / Not Cleared': '#6B7280',
  'Pre-Op / Cleared': '#3B82F6',
  'Peri-Op / In Surgery': '#F59E0B',
  'Post-Op / In-Patient': '#10B981',
  'Post-Op / Discharged': '#6B7280',
} as const;

export function isValidPatientStatus(value: string): value is PatientStatus {
  return PATIENT_STATUS_VALUES.includes(value as PatientStatus);
}

export const DEFAULT_PATIENT_STATUS: PatientStatus = 'Pre-Op / Not Cleared';

// ─── Patient Priority (DB-canonical values) ─────────────────────────────────

export type PatientPriority =
  | 'Not Selected'
  | 'Routine'
  | 'Moderate'
  | 'Urgent'
  | 'Emergency';

export const PATIENT_PRIORITY_VALUES: readonly PatientPriority[] = [
  'Not Selected',
  'Routine',
  'Moderate',
  'Urgent',
  'Emergency',
] as const;

export const PATIENT_PRIORITY_LABELS: Record<PatientPriority, string> = {
  'Not Selected': 'Not Selected',
  'Routine': 'Routine',
  'Moderate': 'Moderate',
  'Urgent': 'Urgent',
  'Emergency': 'Emergency',
} as const;

export const PATIENT_PRIORITY_ORDER: Record<PatientPriority, number> = {
  'Emergency': 0,
  'Urgent': 1,
  'Moderate': 2,
  'Routine': 3,
  'Not Selected': 4,
} as const;

export const PATIENT_PRIORITY_COLORS: Record<PatientPriority, string> = {
  'Emergency': '#DC2626',
  'Urgent': '#EA580C',
  'Moderate': '#CA8A04',
  'Routine': '#16A34A',
  'Not Selected': '#6B7280',
} as const;

export function isValidPatientPriority(value: string): value is PatientPriority {
  return PATIENT_PRIORITY_VALUES.includes(value as PatientPriority);
}

export function sortByPriority<T extends { priority?: PatientPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aPriority = a.priority || 'Not Selected';
    const bPriority = b.priority || 'Not Selected';
    return PATIENT_PRIORITY_ORDER[aPriority] - PATIENT_PRIORITY_ORDER[bPriority];
  });
}

export const DEFAULT_PATIENT_PRIORITY: PatientPriority = 'Not Selected';

// ─── Baseline Ambulatory ────────────────────────────────────────────────────

export type BaselineAmbu =
  | 'Not Selected'
  | 'Independent'
  | 'Boot'
  | 'Crutches'
  | 'Walker'
  | 'Non-Ambulatory';

export const BASELINE_AMBU_VALUES: readonly BaselineAmbu[] = [
  'Not Selected',
  'Independent',
  'Boot',
  'Crutches',
  'Walker',
  'Non-Ambulatory',
] as const;

// ─── Gender ─────────────────────────────────────────────────────────────────

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export const GENDER_VALUES: readonly Gender[] = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say',
] as const;

export const GENDER_LABELS: Record<Gender, string> = {
  'Male': 'Male',
  'Female': 'Female',
  'Other': 'Other',
  'Prefer not to say': 'Prefer not to say',
} as const;

export function isValidGender(value: string): value is Gender {
  return GENDER_VALUES.includes(value as Gender);
}

export const DEFAULT_GENDER: Gender | undefined = undefined;

// ─── Account Type ───────────────────────────────────────────────────────────

export type AccountType =
  | 'Doctor'
  | 'Triage'
  | 'Admin'
  | 'Nurse'
  | 'Coordinator';

export const ACCOUNT_TYPE_VALUES: readonly AccountType[] = [
  'Doctor',
  'Triage',
  'Admin',
  'Nurse',
  'Coordinator',
] as const;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  'Doctor': 'Doctor',
  'Triage': 'Triage Nurse',
  'Admin': 'Administrator',
  'Nurse': 'Nurse',
  'Coordinator': 'Coordinator',
} as const;

/**
 * Lucide icon *names*, not components.
 *
 * Web imports from `lucide-react` and mobile from `lucide-react-native`; the
 * component types are not portable across the two, so this module carries the
 * mapping and each platform resolves the name to its own icon. Same reason
 * ROLE_BADGE_COLORS in ../care-team/constants.ts ships hex rather than classes.
 *
 * Seeded from the mobile AccountSwitcher's roleConfig so the call directory and
 * the account switcher cannot drift apart.
 */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  'Doctor': 'Stethoscope',
  'Triage': 'Users',
  'Admin': 'ShieldCheck',
  'Nurse': 'HeartPulse',
  'Coordinator': 'ClipboardList',
} as const;

export const ACCOUNT_TYPE_PERMISSIONS: Record<AccountType, string[]> = {
  'Doctor': ['read_patients', 'write_patients', 'read_notes', 'write_notes'],
  'Triage': ['read_patients', 'write_patients', 'triage_patients'],
  'Admin': ['*'],
  'Nurse': ['read_patients', 'write_notes', 'update_vitals'],
  'Coordinator': ['read_patients', 'write_patients', 'coordination'],
} as const;

export function isValidAccountType(value: string): value is AccountType {
  return ACCOUNT_TYPE_VALUES.includes(value as AccountType);
}

export function hasPermission(accountType: AccountType, permission: string): boolean {
  const permissions = ACCOUNT_TYPE_PERMISSIONS[accountType];
  return permissions.includes('*') || permissions.includes(permission);
}

export const DEFAULT_ACCOUNT_TYPE: AccountType = 'Triage';
