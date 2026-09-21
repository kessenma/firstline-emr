// @fajr/shared/user — Shared profile, settings, and credential types
//
// Pure TypeScript — no React/RN imports.
// DB-canonical field names (camelCase of PostgreSQL columns).

import type { AccountType, Gender } from '../patient/enums';

// Re-export for convenience so consumers can import from @fajr/shared/user
export type { AccountType, Gender };

// ─── Theme ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Patient Chart View ─────────────────────────────────────────────────────

export type PatientChartViewMode = 'tabs' | 'dashboard';

// ─── Profile ────────────────────────────────────────────────────────────────

/**
 * Core profile fields shared across web and mobile.
 *
 * Platform-specific extensions:
 *  - Mobile adds: city, isAdmin, googleId, googleEmail, googleImage
 *  - Web adds: missions
 */
export interface ProfileFormValuesBase {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;
  dob?: string | Date;
  gender?: Gender;
  countries: string[];
  languages: string[];
  doctorSpecialty?: string[];
  image?: string | null;
}

// ─── Passkey (display) ──────────────────────────────────────────────────────

/**
 * Passkey credential as displayed in the profile screen.
 * NOT the registration-time credential shape from @fajr/shared/signup.
 */
export interface PasskeyCredentialDisplay {
  id: string;
  deviceName: string | null;
  createdAt: string | Date;
  lastUsedAt?: string | Date | null;
  // Web-specific fields (optional — mobile doesn't return these)
  credentialId?: string;
  credentialDeviceType?: string | null;
  credentialBackedUp?: boolean | null;
}

// ─── Medical License ────────────────────────────────────────────────────────

export type MedicalLicenseStatus = 'pending' | 'verified' | 'rejected';

export const MEDICAL_LICENSE_STATUSES: readonly MedicalLicenseStatus[] = [
  'pending',
  'verified',
  'rejected',
] as const;

/** Base medical license fields matching the DB schema. */
export interface MedicalLicenseRecord {
  specialty: string;
  uploadedAt?: string | Date;
  mimeType?: string;
}

/** Mobile: stored record with file metadata and review status. */
export interface MedicalLicenseStored extends MedicalLicenseRecord {
  id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  status: MedicalLicenseStatus;
}

/** Web: API response with signed URL for viewing. Dates are always parsed to Date objects. */
export interface MedicalLicenseView extends Omit<MedicalLicenseRecord, 'uploadedAt'> {
  signedUrl: string;
  uploadedAt?: Date;
}

// ─── Photo Upload ───────────────────────────────────────────────────────────

export interface PhotoUploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// ─── User Settings ──────────────────────────────────────────────────────────

/**
 * User settings fields that map to the user_settings DB table.
 * Canonical shape shared across platforms.
 */
export interface UserSettingsBase {
  userId: string;
  themeMode?: ThemeMode;
  patientChartView?: PatientChartViewMode;
  dataSyncWifiOnly?: boolean;
  translationModelWifiOnly?: boolean;
  callTranscriptionMode?: CallTranscriptionMode;
}

/**
 * How (or whether) a clinician's device transcribes patient video calls.
 *
 * Off by default. This is the clinician consenting for their own side only —
 * the patient consents separately, per call, before joining. Transcription
 * requires both.
 */
export type CallTranscriptionMode = 'off' | 'live' | 'post_call';

export const CALL_TRANSCRIPTION_MODES: CallTranscriptionMode[] = [
  'off',
  'post_call',
  'live',
];

export const CALL_TRANSCRIPTION_MODE_LABELS: Record<
  CallTranscriptionMode,
  string
> = {
  off: 'Off',
  post_call: 'After the call',
  live: 'During the call',
};

export const CALL_TRANSCRIPTION_MODE_DESCRIPTIONS: Record<
  CallTranscriptionMode,
  string
> = {
  off: 'No recording or transcription.',
  post_call:
    'Records the call and writes notes after you hang up. Audio stays on this phone and is deleted once the notes are written.',
  live: 'Transcribes as you talk and shows captions. Uses more battery during the call.',
};

export function isCallTranscriptionMode(
  value: unknown,
): value is CallTranscriptionMode {
  return (
    value === 'off' || value === 'live' || value === 'post_call'
  );
}
