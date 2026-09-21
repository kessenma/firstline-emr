// data/patientStatus.enum.ts
import { PATIENT_STATUS_VALUES } from '@fajr/shared/patient';

export enum PatientStatusList {
    PRE_OP_NOT_CLEARED = 'Pre-Op / Not Cleared',
    PRE_OP_CLEARED = 'Pre-Op / Cleared',
    PERI_OP_IN_SURGERY = 'Peri-Op / In Surgery',
    POST_OP_IN_PATIENT = 'Post-Op / In-Patient',
    POST_OP_DISCHARGED = 'Post-Op / Discharged',
}

export const PatientStatuses = PATIENT_STATUS_VALUES;
