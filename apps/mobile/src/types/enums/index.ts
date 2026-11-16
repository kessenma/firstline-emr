// Re-export all enums from shared package
export type { Gender } from '@firstline/shared/patient';
export { GENDER_VALUES, GENDER_LABELS, isValidGender, DEFAULT_GENDER } from '@firstline/shared/patient';

export type { PatientStatus } from '@firstline/shared/patient';
export {
  PATIENT_STATUS_VALUES,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_COLORS,
  isValidPatientStatus,
  DEFAULT_PATIENT_STATUS,
} from '@firstline/shared/patient';

export type { PatientPriority } from '@firstline/shared/patient';
export {
  PATIENT_PRIORITY_VALUES,
  PATIENT_PRIORITY_LABELS,
  PATIENT_PRIORITY_ORDER,
  PATIENT_PRIORITY_COLORS,
  isValidPatientPriority,
  sortByPriority,
  DEFAULT_PATIENT_PRIORITY,
} from '@firstline/shared/patient';

export type { AccountType } from '@firstline/shared/patient';
export {
  ACCOUNT_TYPE_VALUES,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_PERMISSIONS,
  isValidAccountType,
  hasPermission,
  DEFAULT_ACCOUNT_TYPE,
} from '@firstline/shared/patient';
