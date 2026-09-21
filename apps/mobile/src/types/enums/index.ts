// Re-export all enums from shared package
export type { Gender } from '@fajr/shared/patient';
export { GENDER_VALUES, GENDER_LABELS, isValidGender, DEFAULT_GENDER } from '@fajr/shared/patient';

export type { PatientStatus } from '@fajr/shared/patient';
export {
  PATIENT_STATUS_VALUES,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_COLORS,
  isValidPatientStatus,
  DEFAULT_PATIENT_STATUS,
} from '@fajr/shared/patient';

export type { PatientPriority } from '@fajr/shared/patient';
export {
  PATIENT_PRIORITY_VALUES,
  PATIENT_PRIORITY_LABELS,
  PATIENT_PRIORITY_ORDER,
  PATIENT_PRIORITY_COLORS,
  isValidPatientPriority,
  sortByPriority,
  DEFAULT_PATIENT_PRIORITY,
} from '@fajr/shared/patient';

export type { AccountType } from '@fajr/shared/patient';
export {
  ACCOUNT_TYPE_VALUES,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_PERMISSIONS,
  isValidAccountType,
  hasPermission,
  DEFAULT_ACCOUNT_TYPE,
} from '@fajr/shared/patient';
