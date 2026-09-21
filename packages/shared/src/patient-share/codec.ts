import type { PatientCardPayload, PatientCardSource } from './types';
import { getAnonymizedName } from '../patient-utils/formatting';

/**
 * Empty and whitespace-only strings are treated as absent.
 *
 * Mobile senders historically wrote `''` where web wrote `null` for the same
 * missing field, so both renderers had to guard for both. Normalising here
 * means downstream code only ever checks for `null`.
 */
function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSpecialties(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Build a canonical payload from any patient-ish object.
 *
 * Returns `null` when there is no usable `patientId` — a card without one is
 * unrenderable and previously produced a blank card that still offered to open
 * a chart for `undefined`.
 */
export function buildPatientCardPayload(
  source: PatientCardSource,
): PatientCardPayload | null {
  const patientId = normalizeText(source.patientId) ?? normalizeText(source.id);
  if (!patientId) return null;

  return {
    patientId,
    firstName: normalizeText(source.firstName),
    lastName: normalizeText(source.lastName),
    status: normalizeText(source.status),
    priority: normalizeText(source.priority),
    specialties: normalizeSpecialties(source.specialties),
    hospital: normalizeText(source.hospital),
    chiefComplaint: normalizeText(source.chiefComplaint),
    diagnosis: normalizeText(source.diagnosis),
  };
}

export function serializePatientCard(payload: PatientCardPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parse and validate a `patient-card` message body.
 *
 * Returns `null` for anything that isn't a JSON object carrying a usable
 * `patientId`. Validation runs through `buildPatientCardPayload`, so a parsed
 * payload is normalised identically to a freshly built one.
 */
export function parsePatientCard(text: string): PatientCardPayload | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  return buildPatientCardPayload(raw as PatientCardSource);
}

/**
 * Short, non-identifying description for notification bodies and thread previews.
 *
 * Push bodies render on lock screens, so this deliberately uses initials via
 * `getAnonymizedName` and never the full name, chief complaint, or diagnosis.
 */
export function summarizePatientCard(payload: PatientCardPayload): string {
  const initials = getAnonymizedName(payload.firstName, payload.lastName);
  return initials === 'N/A'
    ? 'Shared a patient card'
    : `Shared a patient card: ${initials}`;
}

/**
 * Convenience for message-preview call sites that hold the raw `text` column and
 * only want a display string. Falls back for payloads that fail validation.
 */
export function summarizePatientCardText(text: string): string {
  const payload = parsePatientCard(text);
  return payload ? summarizePatientCard(payload) : 'Shared a patient card';
}
