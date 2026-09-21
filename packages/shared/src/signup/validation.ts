import type { AccountType } from './types';

export const PASSWORD_MIN_LENGTH = 8;
export const MAX_SPECIALTIES = 2;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password === confirm;
}

/** Check that a date-of-birth string (MM/DD/YYYY) is a real date in the past. */
export function isValidDob(dob: string): boolean {
  if (!dob) return false;
  const parts = dob.split('/');
  if (parts.length !== 3) return false;
  const [month, day, year] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }
  return date < new Date();
}

/** Returns the total number of steps for a given account type. */
export function getTotalSteps(accountType: AccountType | null): number {
  if (accountType === 'Doctor') return 6; // 0-5 (license + missions)
  if (accountType === 'Triage') return 5; // 0-4 (missions last)
  return 5; // default before selection
}

/** Returns the index of the final step. */
export function getFinalStep(accountType: AccountType | null): number {
  return getTotalSteps(accountType) - 1;
}
