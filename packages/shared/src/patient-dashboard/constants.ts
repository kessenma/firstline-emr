import type { ViewMode, CareTeamScope, DashboardFilters, MissionStatusGroup } from './types';
import { PATIENT_PRIORITY_VALUES } from '../patient/enums';

export const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'discharged', label: 'Discharged' },
  { value: 'all', label: 'All Patients' },
];

export const CARE_TEAM_SCOPES: {
  value: CareTeamScope;
  label: string;
  doctorOnly?: boolean;
}[] = [
  { value: 'my-cases', label: 'My Cases' },
  { value: 'im-lead', label: "I'm Lead", doctorOnly: true },
  { value: 'all', label: 'All' },
];

export const DASHBOARD_PRIORITY_OPTIONS = PATIENT_PRIORITY_VALUES.filter(
  (p) => p !== 'Not Selected',
);

export const MISSION_GROUP_ORDER: MissionStatusGroup[] = ['active', 'planned', 'completed'];

export const MISSION_GROUP_LABELS: Record<MissionStatusGroup, string> = {
  active: 'Active Missions',
  planned: 'Planned Missions',
  completed: 'Completed Missions',
};

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  search: '',
  viewMode: 'active',
  status: undefined,
  priority: undefined,
  specialty: undefined,
  hospital: undefined,
  missionIds: [],
  careTeamScope: 'all',
  showFollowUps: false,
  showUnassignedSpecialty: false,
  showConflictsOnly: false,
  showTelegramOnly: false,
};

export const CARE_TEAM_VISIBLE_ACCOUNT_TYPES = ['Doctor', 'Triage'] as const;
