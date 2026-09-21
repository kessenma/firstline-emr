// Withdrawing a prescription.
//
// Three parties can stop a script and each knows something the others do not:
// a pharmacist knows the drug is unavailable or the dose is wrong, a doctor
// knows the clinical picture changed, a patient knows they filled it elsewhere
// or reacted badly. What differs between them is how much explanation is
// demanded, which is the one asymmetry this module encodes.
//
// Cancellation is deliberately NOT an `rxStatus` value. `rxStatus` is the
// pharmacy's fulfilment answer (`not reviewed` / `partially filled` /
// `declined` / `completed`), and a pharmacy that partially filled a script
// which is then cancelled has told us something real — the patient already has
// half the medication. Folding cancellation into that enum overwrites it. The
// two are separate axes and read together; `describePrescriptionCancellation`
// is what makes them one line on a card.

import { Languages, normalizeLanguage } from '../constants/languages';
import { formatMedicationDateOnly, toDate } from './utils';
import type { RxOrder } from './types';

// Declared on RxOrder in ./types so that type stays self-describing; this is
// the canonical name callers import.
export type { RxCancellerRole } from './types';
import type { RxCancellerRole } from './types';

export const RX_CANCELLER_ROLES: readonly RxCancellerRole[] = [
  'doctor',
  'pharmacist',
  'patient',
];

export function isRxCancellerRole(value: unknown): value is RxCancellerRole {
  return RX_CANCELLER_ROLES.includes(value as RxCancellerRole);
}

/**
 * Only the pharmacist must explain themselves.
 *
 * A script that stops working at the counter with no reason sends the patient
 * back to the clinic to find out why. A doctor is already in the record and can
 * be asked; a patient owes nobody an explanation, though we offer them one.
 */
export function isCancellationReasonRequired(role: RxCancellerRole): boolean {
  return role === 'pharmacist';
}

// ---------------------------------------------------------------------------
// Patient preset reasons
// ---------------------------------------------------------------------------

/**
 * Codes rather than free text, because the patient is on a phone, often in a
 * second language, and the care team needs something consistent to scan. The
 * optional note beside it carries anything the list does not cover.
 */
export const PATIENT_CANCELLATION_REASONS = [
  'already-filled',
  'no-longer-needed',
  'side-effects',
  'too-expensive',
  'other',
] as const;

export type PatientCancellationReasonCode =
  (typeof PATIENT_CANCELLATION_REASONS)[number];

export function isPatientCancellationReasonCode(
  value: unknown,
): value is PatientCancellationReasonCode {
  return PATIENT_CANCELLATION_REASONS.includes(
    value as PatientCancellationReasonCode,
  );
}

/**
 * Labels in every language the prescription message supports, so the patient
 * picks in their own language and the care team reads it in theirs — the code
 * in between is what makes that possible.
 */
const PATIENT_REASON_LABELS: Record<
  Languages,
  Record<PatientCancellationReasonCode, string>
> = {
  [Languages.ENGLISH]: {
    'already-filled': 'I already filled it somewhere else',
    'no-longer-needed': 'I no longer need it',
    'side-effects': 'It made me feel unwell',
    'too-expensive': 'It costs too much',
    other: 'Another reason',
  },
  [Languages.ARABIC]: {
    'already-filled': 'لقد صرفتها بالفعل من مكان آخر',
    'no-longer-needed': 'لم أعد بحاجة إليها',
    'side-effects': 'جعلتني أشعر بتوعك',
    'too-expensive': 'تكلفتها مرتفعة جدًا',
    other: 'سبب آخر',
  },
  [Languages.FARSI]: {
    'already-filled': 'قبلاً آن را از جای دیگری تهیه کرده‌ام',
    'no-longer-needed': 'دیگر به آن نیاز ندارم',
    'side-effects': 'حالم را بد کرد',
    'too-expensive': 'هزینه آن خیلی زیاد است',
    other: 'دلیل دیگر',
  },
  [Languages.PASHTO]: {
    'already-filled': 'ما دا دمخه له بل ځای څخه اخیستې ده',
    'no-longer-needed': 'نور ورته اړتیا نلرم',
    'side-effects': 'زما حال یې خراب کړ',
    'too-expensive': 'قیمت یې ډېر لوړ دی',
    other: 'بل دلیل',
  },
  [Languages.TURKISH]: {
    'already-filled': 'Başka bir yerden zaten aldım',
    'no-longer-needed': 'Artık ihtiyacım yok',
    'side-effects': 'Kendimi kötü hissettirdi',
    'too-expensive': 'Çok pahalı',
    other: 'Başka bir sebep',
  },
  [Languages.URDU]: {
    'already-filled': 'میں یہ پہلے ہی کہیں اور سے لے چکا ہوں',
    'no-longer-needed': 'مجھے اب اس کی ضرورت نہیں',
    'side-effects': 'اس سے میری طبیعت خراب ہوئی',
    'too-expensive': 'یہ بہت مہنگی ہے',
    other: 'کوئی اور وجہ',
  },
  [Languages.SPANISH]: {
    'already-filled': 'Ya la conseguí en otro lugar',
    'no-longer-needed': 'Ya no la necesito',
    'side-effects': 'Me hizo sentir mal',
    'too-expensive': 'Cuesta demasiado',
    other: 'Otro motivo',
  },
  [Languages.FRENCH]: {
    'already-filled': "Je l'ai déjà obtenue ailleurs",
    'no-longer-needed': "Je n'en ai plus besoin",
    'side-effects': "Elle m'a rendu malade",
    'too-expensive': 'Elle coûte trop cher',
    other: 'Une autre raison',
  },
};

/** The reason list to show a patient, in their language. */
export function getPatientCancellationReasons(
  language?: string | null,
): Array<{ code: PatientCancellationReasonCode; label: string }> {
  const table = PATIENT_REASON_LABELS[normalizeLanguage(language)];
  return PATIENT_CANCELLATION_REASONS.map((code) => ({
    code,
    label: table[code],
  }));
}

/**
 * A patient's reason code rendered for staff — always English, because this is
 * what lands in the care team's notification and on the chart.
 */
export function describePatientReasonCode(
  code: string | null | undefined,
): string | null {
  if (!isPatientCancellationReasonCode(code)) return null;
  return PATIENT_REASON_LABELS[Languages.ENGLISH][code];
}

// ---------------------------------------------------------------------------
// Reading cancellation state
// ---------------------------------------------------------------------------

type CancellationFields = Pick<
  RxOrder,
  | 'cancelledAt'
  | 'cancelledByRole'
  | 'cancellationReason'
  | 'cancellationReasonCode'
>;

export function isPrescriptionCancelled(
  rxOrder: CancellationFields | null | undefined,
): boolean {
  return !!toDate(rxOrder?.cancelledAt);
}

/** How each role is named to staff. "The pharmacy", not a person's name. */
const ROLE_LABELS: Record<RxCancellerRole, string> = {
  doctor: 'the prescriber',
  pharmacist: 'the pharmacy',
  patient: 'the patient',
};

export interface RxCancellationSummary {
  /** "Cancelled by the pharmacy · 13 Aug" */
  headline: string;
  /** The reason as staff should read it, or null if none was given. */
  reason: string | null;
  role: RxCancellerRole | null;
}

/**
 * The cancellation line both charts render.
 *
 * Returns null for a live prescription, so callers can use it as the condition
 * as well as the content.
 */
export function describePrescriptionCancellation(
  rxOrder: CancellationFields | null | undefined,
): RxCancellationSummary | null {
  const cancelledAt = toDate(rxOrder?.cancelledAt);
  if (!cancelledAt) return null;

  const role = isRxCancellerRole(rxOrder?.cancelledByRole)
    ? rxOrder.cancelledByRole
    : null;

  const by = role ? ` by ${ROLE_LABELS[role]}` : '';

  // A patient's preset code and their optional note are joined rather than
  // one winning: "I no longer need it — my surgery was cancelled" says more
  // than either half.
  const presetLabel = describePatientReasonCode(rxOrder?.cancellationReasonCode);
  const freeText = rxOrder?.cancellationReason?.trim() || null;
  const reason =
    presetLabel && freeText
      ? `${presetLabel} — ${freeText}`
      : (presetLabel ?? freeText);

  return {
    headline: `Cancelled${by} · ${formatMedicationDateOnly(cancelledAt)}`,
    reason,
    role,
  };
}

/**
 * What a status badge should read.
 *
 * Cancellation wins over fulfilment for display while both stay in the record —
 * this is the one place that precedence is decided, so the two platforms cannot
 * disagree about a partially-filled-then-cancelled script.
 */
export function getPrescriptionStatusLabel(
  rxOrder:
    | (CancellationFields & Pick<RxOrder, 'rxStatus'>)
    | null
    | undefined,
): string | null {
  if (isPrescriptionCancelled(rxOrder)) return 'Cancelled';
  return rxOrder?.rxStatus ?? null;
}

// ---------------------------------------------------------------------------
// Request payloads — shared so the three surfaces cannot drift
// ---------------------------------------------------------------------------

export interface CancelPrescriptionRequest {
  reason?: string | null;
  reasonCode?: PatientCancellationReasonCode | null;
}

export type CancelValidationResult =
  | { ok: true }
  | { ok: false; error: 'reason-required' };

/**
 * Validated on the server as well as in the form, because the pharmacist's
 * required reason is a rule about the record, not about the UI.
 */
export function validateCancellation(
  role: RxCancellerRole,
  request: CancelPrescriptionRequest,
): CancelValidationResult {
  if (isCancellationReasonRequired(role) && !request.reason?.trim()) {
    return { ok: false, error: 'reason-required' };
  }
  return { ok: true };
}
