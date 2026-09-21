// Re-export business rules from the shared package
export {
  canEditSpecialty,
  getFilteredStatusOptions,
  getFilteredPriorityOptions,
  getSpecialtyTooltipMessage,
  isTriageUser,
  isDoctorUser as isDoctor,
} from '@fajr/shared/patient-dashboard';
export type { DashboardUserSession as UserSession } from '@fajr/shared/patient-dashboard';
