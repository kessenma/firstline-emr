import type { CareTeamRole } from '@fajr/shared/care-team';

export const ROLE_BADGE_TAILWIND: Record<CareTeamRole, string> = {
  surgeon: 'bg-blue-100 text-blue-800',
  assistant: 'bg-green-100 text-green-800',
  consulting: 'bg-purple-100 text-purple-800',
  triage: 'bg-amber-100 text-amber-800',
  coordinator: 'bg-gray-100 text-gray-800',
};
