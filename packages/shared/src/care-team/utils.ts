import type { CareTeamRole } from './types';

/**
 * Returns the care team roles a user may *choose* when joining a patient.
 *
 * Note `triage` is deliberately absent: it is not a role anyone picks, it is
 * assigned automatically when a Triage user edits a patient's specialty,
 * status or priority. That membership row is the record of who triaged them.
 * See `ensureCareTeamMembership` on the server.
 */
export function getRolesForAccountType(accountType: string): CareTeamRole[] {
  if (accountType === 'Doctor') return ['surgeon', 'assistant', 'consulting'];
  if (accountType === 'Triage') return ['coordinator'];
  return [];
}

/** The role automatically recorded when a user mutates a patient. Returns null
 *  for account types that should not be auto-enrolled (Doctors join explicitly
 *  via the chart-access prompt, so editing alone must not add them). */
export function getAutoEnrolRole(accountType?: string | null): CareTeamRole | null {
  if (accountType === 'Triage') return 'triage';
  if (accountType === 'Coordinator') return 'coordinator';
  return null;
}

/** Only surgeon is considered a lead role */
export function isLeadRole(role: CareTeamRole | string): boolean {
  return role === 'surgeon';
}
