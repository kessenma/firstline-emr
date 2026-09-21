export type CareTeamRole = 'surgeon' | 'assistant' | 'consulting' | 'triage' | 'coordinator';

export interface CareTeamMemberJSON {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: CareTeamRole;
  isLead: boolean;
}
