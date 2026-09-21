import type { CareTeamRole } from './types';

export const CARE_TEAM_ROLES: CareTeamRole[] = [
  'surgeon',
  'assistant',
  'consulting',
  'triage',
  'coordinator',
];

export const ROLE_LABELS: Record<CareTeamRole, string> = {
  surgeon: 'Surgeon (Lead)',
  assistant: 'Assistant',
  consulting: 'Consulting',
  triage: 'Triage',
  coordinator: 'Coordinator',
};

export const ROLE_DESCRIPTIONS: Record<CareTeamRole, string> = {
  surgeon: 'You will be assigned as lead doctor for this patient',
  assistant: 'Assist the lead surgeon on this case',
  consulting: 'Provide consulting expertise for this case',
  triage: 'Manage triage and patient flow',
  coordinator: 'Coordinate care logistics',
};

export const ROLE_BADGE_COLORS: Record<CareTeamRole, { bg: string; text: string }> = {
  surgeon: { bg: '#dbeafe', text: '#1e40af' },
  assistant: { bg: '#dcfce7', text: '#166534' },
  consulting: { bg: '#f3e8ff', text: '#6b21a8' },
  triage: { bg: '#fef3c7', text: '#92400e' },
  coordinator: { bg: '#f3f4f6', text: '#374151' },
};
