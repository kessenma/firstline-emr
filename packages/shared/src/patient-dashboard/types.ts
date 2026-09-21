// Shared types for the patient dashboard filter system (web + mobile)

export type ViewMode = 'active' | 'discharged' | 'all';

export type CareTeamScope = 'all' | 'my-cases' | 'im-lead';

export interface DashboardFilters {
  search: string;
  viewMode: ViewMode;
  status?: string;
  priority?: string;
  specialty?: string;
  hospital?: string;
  missionIds: string[];
  careTeamScope: CareTeamScope;
  showFollowUps: boolean;
  showUnassignedSpecialty: boolean;
  showConflictsOnly: boolean;
  showTelegramOnly: boolean;
}

export type MissionStatusGroup = 'active' | 'planned' | 'completed';

/** Generic enrichment type — both platforms define their own Patient base type */
export type WithUnreadMessages<T> = T & { unreadMessages: number };

/** Minimal user session shape for business rule functions */
export interface DashboardUserSession {
  user?: {
    accountType?: string;
    email?: string;
  };
}
