// apps/mobile/src/components/patient-chart/medications/medicationUtils.ts
//
// Thin re-export. The implementations live in `@firstline/shared/medications` so
// mobile and web sort, format and narrow medication orders identically.

export {
  isRxOrder,
  isMedOrder,
  getMedicationDate,
  formatMedicationDate,
  formatMedicationDateOnly,
  getAllMedicationsSorted,
  getMedicationItemCount,
  getPrescriptionLink,
  hasPharmacyQrCode,
  buildPrescriptionMessage,
  buildPrescriptionSummary,
  toDate,
} from '@firstline/shared/medications';

export type {
  AnyMedication,
  Medication,
  MedOrder,
  Prescription,
  RxOrder,
} from '@firstline/shared/medications';
