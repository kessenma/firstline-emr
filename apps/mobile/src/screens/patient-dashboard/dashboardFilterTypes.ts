// Re-export dashboard filter types and utilities from the shared package
export type { ViewMode, CareTeamScope, DashboardFilters } from '@firstline/shared/patient-dashboard';
export {
  DEFAULT_DASHBOARD_FILTERS,
  getActiveFilterCount,
  applyDashboardFilters,
  reduceDashboardFilters,
  clearDashboardFilters,
} from '@firstline/shared/patient-dashboard';
