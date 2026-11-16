// Re-export all patient utilities from shared package
export {
  formatLocation,
  getInitials,
  dobToAge,
  formatDate,
  formatDateShort,
  getFullName,
  truncateText,
  formatSpecialties,
} from '@firstline/shared/patient-utils';

// Re-export color utilities (now using DB-canonical priority values)
export { getStatusColor, getPriorityColor } from '@firstline/shared/patient-utils';
