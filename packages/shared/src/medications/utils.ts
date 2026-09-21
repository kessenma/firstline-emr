// packages/shared/src/medications/utils.ts

import type {
  AnyMedication,
  MedOrder,
  MedicationTimestamp,
  RxOrder,
} from './types';

/**
 * Narrows the combined list to RX orders. `prescriptions` is the only key that
 * exists on `RxOrder` and never on `MedOrder`.
 */
export function isRxOrder(item: AnyMedication): item is RxOrder {
  return 'prescriptions' in item;
}

export function isMedOrder(item: AnyMedication): item is MedOrder {
  return !isRxOrder(item);
}

/** Parses any of the three wire formats (Date, ISO string, SQLite text). */
export function toDate(value: MedicationTimestamp | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** The date a medication is sorted and displayed by, whichever type it is. */
export function getMedicationDate(item: AnyMedication): Date | null {
  return toDate(isRxOrder(item) ? item.prescribedDate : item.orderDate);
}

export function formatMedicationDate(
  value: MedicationTimestamp | null | undefined,
  fallback = 'Unknown date',
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatMedicationDateOnly(
  value: MedicationTimestamp | null | undefined,
  fallback = 'Not available',
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/** Newest first. Orders with no usable date sort to the bottom. */
export function sortMedicationsByDateDesc<T extends AnyMedication>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = getMedicationDate(a);
    const db = getMedicationDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  });
}

export function getAllMedicationsSorted(
  rxOrders: RxOrder[],
  medOrders: MedOrder[],
): AnyMedication[] {
  return sortMedicationsByDateDesc<AnyMedication>([...rxOrders, ...medOrders]);
}

export function getMedicationItemCount(item: AnyMedication): number {
  return isRxOrder(item)
    ? item.prescriptions?.length ?? 0
    : item.medications?.length ?? 0;
}

/**
 * Returns the patient-facing prescription link, or `null` if it is unusable.
 *
 * Rejects strings containing the literal `undefined`/`null`, which is what
 * `${baseUrl}/rx-order/patient/${id}` produces when the base URL env var is
 * missing at creation time. Those strings are truthy and would otherwise be
 * sent to a patient as a dead link.
 */
export function getPrescriptionLink(rxOrder: Pick<RxOrder, 'patientRxUrl'> | null | undefined): string | null {
  const raw = rxOrder?.patientRxUrl;
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;
  if (/(^|\/)(undefined|null)(\/|$)/.test(url)) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

/** True when the order carries a QR image that can actually be rendered. */
export function hasPharmacyQrCode(
  rxOrder: Pick<RxOrder, 'pharmacyQrCode'> | null | undefined,
): boolean {
  const qr = rxOrder?.pharmacyQrCode;
  return typeof qr === 'string' && qr.startsWith('data:image/');
}

/**
 * True once the patient-facing link has been pushed to the patient's messaging
 * thread. Drives the "already sent" state on both charts.
 */
export function hasSentPrescriptionLink(
  rxOrder: Pick<RxOrder, 'patientLinkSentAt'> | null | undefined,
): boolean {
  return !!toDate(rxOrder?.patientLinkSentAt);
}

/**
 * True once the patient has passed the access gate at least once.
 *
 * Only ever set from a successful unlock POST, never from a page load —
 * messaging apps fetch link previews, so a GET-based signal would report
 * prescriptions as read that no human opened.
 */
export function hasOpenedPrescriptionLink(
  rxOrder: Pick<RxOrder, 'patientLinkOpenedAt'> | null | undefined,
): boolean {
  return !!toDate(rxOrder?.patientLinkOpenedAt);
}

export interface PrescriptionDeliveryStatus {
  /** One line for the card: where this prescription got to. */
  summary: string;
  /** Present only when the link is under attack or locked out. */
  warning: string | null;
  sent: boolean;
  opened: boolean;
  locked: boolean;
}

/**
 * The delivery line both charts render, worded once here so web and mobile
 * cannot describe the same state differently.
 */
export function describePrescriptionDelivery(
  rxOrder: Pick<
    RxOrder,
    | 'patientLinkSentAt'
    | 'patientLinkOpenedAt'
    | 'patientLinkFailedCount'
    | 'patientLinkLastFailedAt'
    | 'patientLinkLockState'
  >,
): PrescriptionDeliveryStatus {
  const sentAt = toDate(rxOrder.patientLinkSentAt);
  const openedAt = toDate(rxOrder.patientLinkOpenedAt);
  const failed = rxOrder.patientLinkFailedCount ?? 0;
  const lockState = rxOrder.patientLinkLockState ?? 'ok';

  let summary: string;
  if (!sentAt) {
    summary = 'Not sent to the patient yet';
  } else if (openedAt) {
    summary = `Sent ${formatMedicationDateOnly(sentAt)} · opened ${formatMedicationDateOnly(openedAt)}`;
  } else {
    summary = `Sent ${formatMedicationDateOnly(sentAt)} · not opened yet`;
  }

  let warning: string | null = null;
  if (lockState === 'locked') {
    warning = `Link locked after ${failed} failed access attempts — re-send to issue a new code`;
  } else if (failed > 0) {
    const lastFailed = toDate(rxOrder.patientLinkLastFailedAt);
    const attempts = `${failed} failed access attempt${failed === 1 ? '' : 's'}`;
    warning = lastFailed
      ? `${attempts} · last ${formatMedicationDate(lastFailed)}`
      : attempts;
  }

  return {
    summary,
    warning,
    sent: !!sentAt,
    opened: !!openedAt,
    locked: lockState === 'locked',
  };
}

/** Plain-text summary of an RX order, for share sheets and clipboard export. */
export function buildPrescriptionSummary(rxOrder: RxOrder): string {
  const lines: string[] = [
    `RX Prescription from Dr. ${rxOrder.prescribingDr || 'Unknown'}`,
  ];
  if (rxOrder.doctorSpecialty) lines.push(`Specialty: ${rxOrder.doctorSpecialty}`);
  lines.push(`Date: ${formatMedicationDate(rxOrder.prescribedDate)}`);
  if (rxOrder.validTill) {
    lines.push(`Valid Till: ${formatMedicationDateOnly(rxOrder.validTill)}`);
  }
  if (rxOrder.city) lines.push(`City: ${rxOrder.city}`);

  lines.push('', 'Prescriptions:');
  const prescriptions = rxOrder.prescriptions ?? [];
  if (prescriptions.length === 0) {
    lines.push('None');
  } else {
    prescriptions.forEach((p, i) => {
      lines.push(
        `${i + 1}. ${p.medication || 'N/A'} - ${p.dosage || 'N/A'}, ${p.frequency || 'N/A'} (${p.diagnosis || 'N/A'})`,
      );
    });
  }

  const link = getPrescriptionLink(rxOrder);
  if (link) lines.push('', `Prescription link: ${link}`);

  return lines.join('\n');
}
