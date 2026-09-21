// apps/mobile/src/components/tablet/tabletTableColumns.ts
// Column definitions for the iPad tablet patient dashboard table

import type { PatientWithMessages } from '../../types/patient';
import {
  dobToAge,
  formatLocation,
  truncateText,
  formatSpecialties,
} from '../../utils/patientUtils';
import { getAnonymizedName } from '@fajr/shared/patient-utils';

export interface TabletColumn {
  key: string;
  label: string;
  width: number;
  sortable: boolean;
  frozen?: boolean;
}

export const TABLET_COLUMNS: TabletColumn[] = [
  { key: 'name',            label: 'Patient',         width: 160, sortable: true },
  { key: 'age',             label: 'Age',             width: 60,  sortable: true },
  { key: 'status',          label: 'Status',          width: 100, sortable: true },
  { key: 'priority',        label: 'Priority',        width: 90,  sortable: true },
  { key: 'hospital_name',   label: 'Hospital',        width: 120, sortable: true },
  { key: 'specialty',       label: 'Specialty',       width: 110, sortable: true },
  { key: 'chief_complaint', label: 'Chief Complaint', width: 160, sortable: false },
  { key: 'location',        label: 'Location',        width: 100, sortable: true },
  { key: 'language',        label: 'Lang',            width: 60,  sortable: true },
  { key: 'unreadMessages',  label: 'Msgs',            width: 55,  sortable: true },
  { key: 'triage_note',     label: 'Triage',          width: 140, sortable: false },
];

export const FROZEN_COLUMN_WIDTH = TABLET_COLUMNS[0].width;

export function getCellValue(patient: PatientWithMessages, key: string): string | number {
  switch (key) {
    case 'name':
      return getAnonymizedName(patient.firstName, patient.lastName);
    case 'age':
      return patient.dob ? dobToAge(patient.dob) : '';
    case 'status':
      return patient.status || '';
    case 'priority':
      return patient.priority || '';
    case 'hospital_name':
      return patient.hospital || '';
    case 'specialty':
      return formatSpecialties(patient.specialties);
    case 'chief_complaint':
      return truncateText(patient.chiefComplaint || '', 25);
    case 'location':
      return formatLocation(patient.city || '', patient.country || '');
    case 'language':
      return patient.language || '';
    case 'unreadMessages':
      return patient.unreadMessages ?? 0;
    case 'triage_note':
      return truncateText(patient.dashboardNotes || '', 30);
    default:
      return '';
  }
}
