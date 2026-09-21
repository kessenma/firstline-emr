import type { AccountType } from './types';

export enum SignupStep {
  UserType = 0,
  Credentials = 1,
  TwoFactorSetup = 2,
  Profile = 3,
  LicenseUpload = 4,
  // Rendered at ordinal 4 for Triage, 5 for Doctor — both apps switch on the
  // raw step number, so this value must stay appended after LicenseUpload.
  MissionSelection = 5,
}

export const STEP_LABELS: Record<SignupStep, string> = {
  [SignupStep.UserType]: 'Account Type',
  [SignupStep.Credentials]: 'Credentials',
  [SignupStep.TwoFactorSetup]: 'Two-Factor Auth',
  [SignupStep.Profile]: 'Profile',
  [SignupStep.LicenseUpload]: 'Medical License',
  [SignupStep.MissionSelection]: 'Missions',
};

/** Returns ordered steps for a given account type. */
export function getStepsForAccountType(accountType: AccountType | null): SignupStep[] {
  const base = [
    SignupStep.UserType,
    SignupStep.Credentials,
    SignupStep.TwoFactorSetup,
    SignupStep.Profile,
  ];
  if (accountType === 'Doctor') {
    base.push(SignupStep.LicenseUpload);
  }
  base.push(SignupStep.MissionSelection);
  return base;
}
