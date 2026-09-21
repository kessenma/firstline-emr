// apps/mobile/src/types/enums/accountType.ts
// Account type enum definitions matching PostgreSQL schema

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
  'Coordinator'
] as const;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  'Doctor': 'Doctor',
  'Triage': 'Triage Nurse',
  'Admin': 'Administrator',
  'Nurse': 'Nurse',
  'Coordinator': 'Coordinator'
} as const;

export const ACCOUNT_TYPE_PERMISSIONS: Record<AccountType, string[]> = {
  'Doctor': ['read_patients', 'write_patients', 'read_notes', 'write_notes'],
  'Triage': ['read_patients', 'write_patients', 'triage_patients'],
  'Admin': ['*'], // All permissions
  'Nurse': ['read_patients', 'write_notes', 'update_vitals'],
  'Coordinator': ['read_patients', 'write_patients', 'coordination']
} as const;

// Validation helper
export function isValidAccountType(value: string): value is AccountType {
  return ACCOUNT_TYPE_VALUES.includes(value as AccountType);
}

// Permission checking helper
export function hasPermission(accountType: AccountType, permission: string): boolean {
  const permissions = ACCOUNT_TYPE_PERMISSIONS[accountType];
  return permissions.includes('*') || permissions.includes(permission);
}

// Default account type for sanitization
export const DEFAULT_ACCOUNT_TYPE: AccountType = 'Triage';
