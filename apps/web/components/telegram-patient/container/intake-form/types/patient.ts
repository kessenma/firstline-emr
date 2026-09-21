// apps/web/components/telegram-patient/container/intake-form/types/patient.ts
export interface PartialPatientFormData {
  id?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  city?: string;
  phone?: { countryCode: string; phoneNumber: string };
  country?: string;
  genderPreference?: string;
  chiefComplaint?: string;
  createdAt?: Date;
  isPatientFields?: {
    isPatient: boolean;
    patientRelation?: string;
  };
  hasSubmittedInfo?: boolean;
  preferredLanguage?: string;
  telegramChatId?: string;
  [key: string]: any;
}
