// apps/mobile/src/types/enums/gender.ts
// Gender enum definitions matching PostgreSQL schema

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export const GENDER_VALUES: readonly Gender[] = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
] as const;

export const GENDER_LABELS: Record<Gender, string> = {
  'Male': 'Male',
  'Female': 'Female',
  'Other': 'Other',
  'Prefer not to say': 'Prefer not to say'
} as const;

// Validation helper
export function isValidGender(value: string): value is Gender {
  return GENDER_VALUES.includes(value as Gender);
}

// Default gender for sanitization
export const DEFAULT_GENDER: Gender | undefined = undefined;
