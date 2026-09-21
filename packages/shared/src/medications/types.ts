// packages/shared/src/medications/types.ts
//
// Single source of truth for medication order shapes across web and mobile.
// The web Drizzle rows are pinned to these types by a compile-time assertion in
// apps/web/db/schema/medications.contract.ts — widening a column there without
// updating this file fails the web build.

/** One line item on an RX prescription referral. */
export interface Prescription {
  diagnosis: string;
  medication: string;
  dosage: string;
  frequency: string;
}

/** One line item on a request for unavailable medications. Carries a quantity. */
export interface Medication {
  _id?: string;
  diagnosis: string;
  medication: string;
  dosage: string;
  frequency: string;
  quantity: string;
}

/**
 * Dates are `Date | string` because the same record arrives as a `Date` from
 * Drizzle on the server, as an ISO string over JSON on the web client, and as a
 * SQLite text column from PowerSync on mobile. Read them through
 * `getMedicationDate` / `formatMedicationDate` rather than calling Date methods
 * directly.
 */
export type MedicationTimestamp = Date | string;

/**
 * An RX prescription referral.
 *
 * `patientRxUrl`, `pharmacyQrUrl` and `pharmacyQrCode` are nullable: they are
 * generated server-side at creation, and are absent on any order read through a
 * projection that omits them. Never interpolate them into patient-facing text
 * directly — use `buildPrescriptionMessage`, which refuses to send a message
 * with a missing link.
 */
export interface RxOrder {
  id: string;
  rxOrderId?: string | null;
  patientId?: string | null;
  doctorSpecialty?: string | null;
  prescribingDr?: string | null;
  drEmail?: string | null;
  drId?: string | null;
  prescribedDate?: MedicationTimestamp | null;
  validTill?: MedicationTimestamp | null;
  city?: string | null;
  prescriptions?: Prescription[] | null;
  patientRxUrl?: string | null;
  pharmacyQrUrl?: string | null;
  /** Base64 `data:image/png;base64,...` payload, not a remote URL. */
  pharmacyQrCode?: string | null;
  rxDispenserName?: string | null;
  rxDispenserContact?: string | null;
  rxStatus?: string | null;
  submitted?: boolean | null;
  partialRxNotes?: string | null;
  createdAt?: MedicationTimestamp | null;
  updatedAt?: MedicationTimestamp | null;

  // --- Delivery + access state -------------------------------------------
  // Written only by the server, read by both charts. The access code itself
  // and the raw attempt log live in `rx_order_access` /
  // `rx_order_access_attempts`, which are deliberately absent from the
  // PowerSync sync rules — a secret must never reach a device.

  /** When the link was pushed to the patient's messaging thread. */
  patientLinkSentAt?: MedicationTimestamp | null;
  patientLinkSentBy?: string | null;
  /**
   * When the patient first passed the access gate.
   *
   * Stamped on successful unlock (a POST), never on page load: messaging apps
   * fetch link previews, so a GET-based stamp marks prescriptions "opened" that
   * no human ever saw.
   */
  patientLinkOpenedAt?: MedicationTimestamp | null;
  patientLinkOpenCount?: number | null;
  patientLinkFailedCount?: number | null;
  patientLinkLastFailedAt?: MedicationTimestamp | null;
  /** Server-computed verdict. Carries no secret, so it is safe to sync. */
  patientLinkLockState?: RxLinkLockState | null;
  pharmacyLinkOpenedAt?: MedicationTimestamp | null;

  // --- Cancellation -------------------------------------------------------
  // Its own axis, deliberately not an `rxStatus` value: a pharmacy that
  // partially filled a script which is then cancelled has told us the patient
  // already holds half the medication, and folding the two together erases
  // that. Read both through `describePrescriptionCancellation` /
  // `getPrescriptionStatusLabel` in ./cancellation.

  /** Set once and never cleared — cancellation is terminal. */
  cancelledAt?: MedicationTimestamp | null;
  cancelledByRole?: RxCancellerRole | null;
  /** Null when the patient cancelled: patients have no `users` row. */
  cancelledByUserId?: string | null;
  /** Free text. Required of a pharmacist, optional for everyone else. */
  cancellationReason?: string | null;
  /** A patient's preset choice, so staff can scan it across languages. */
  cancellationReasonCode?: string | null;
}

/**
 * How the patient link is currently responding to access attempts.
 *
 * `throttled` is transient — a cooldown from the backoff ladder. `locked` is
 * durable and only a staff re-send clears it, which also rotates the code.
 */
export type RxLinkLockState = 'ok' | 'throttled' | 'locked';

/** Re-exported from ./cancellation so `RxOrder` stays self-describing. */
export type RxCancellerRole = 'doctor' | 'pharmacist' | 'patient';

/**
 * Exactly what `GET /api/rx-order-qr-code/patient/{uuid}` returns once the
 * access gate has been passed.
 *
 * This type exists because the endpoint and its consumer drifted: the route
 * returned `PharmacyQrCode` while the page read `pharmacyQrCode`, so the QR
 * silently rendered as "not available" on every prescription ever sent. Nothing
 * caught it — the view model cast `response.json()` (typed `any`) into the
 * Drizzle row type, and the web build has `typescript.ignoreBuildErrors`. Both
 * sides now name this type, so the next rename fails the build instead.
 */
export interface PatientRxPublicView {
  patientName: string;
  patientDob: MedicationTimestamp | null;
  patientCountry: string | null;
  patientCity: string | null;

  rxOrderId: string | null;
  doctorSpecialty: string | null;
  prescribingDr: string | null;
  prescribedDate: MedicationTimestamp | null;
  validTill: MedicationTimestamp | null;
  city: string | null;
  rxStatus: string | null;
  submitted: boolean | null;
  prescriptions: Prescription[] | null;
  /**
   * Base64 `data:image/png;base64,...` payload.
   *
   * Null once `submitted` is set — the patient PATCH route clears it on
   * fulfilment so a pharmacy code cannot be presented twice. A null here with
   * `submitted: true` is correct behaviour, not a missing asset.
   */
  pharmacyQrCode: string | null;

  /**
   * Cancellation, surfaced to the patient.
   *
   * The access gate deliberately still opens for a cancelled prescription —
   * the patient needs to *see* that it was withdrawn and why. Without these
   * fields the page would render a live-looking script whose QR had silently
   * vanished, which reads as a fault rather than a decision.
   */
  cancelledAt: MedicationTimestamp | null;
  cancelledByRole: RxCancellerRole | null;
  cancellationReason: string | null;
  cancellationReasonCode: string | null;
}

/** A request for medications the mission does not currently stock. */
export interface MedOrder {
  id: string;
  patientId?: string | null;
  doctorSpecialty?: string | null;
  prescribingDr?: string | null;
  drEmail?: string | null;
  drId?: string | null;
  orderDate?: MedicationTimestamp | null;
  patientName?: string | null;
  patientPhone?: string | null;
  patientCity?: string | null;
  patientCountry?: string | null;
  validated?: boolean | null;
  medications?: Medication[] | null;
  createdAt?: MedicationTimestamp | null;
  updatedAt?: MedicationTimestamp | null;
}

/** Either order type, as rendered in the combined medications list. */
export type AnyMedication = RxOrder | MedOrder;

/** Payload accepted by `POST /api/patient/{id}/medications/rx-order`. */
export interface CreateRxOrderPayload {
  doctorSpecialty: string;
  prescribingDr: string;
  drEmail: string;
  drId?: string;
  validTill: MedicationTimestamp;
  city: string;
  prescriptions: Prescription[];
}

/** Response of `POST /api/patient/{id}/medications/rx-order`. */
export interface CreateRxOrderResponse {
  message: string;
  /** The persisted row, including the generated link and QR code. */
  rxOrder: RxOrder;
}

/** Response of `GET /api/patient/{id}/medications/rx-order`. */
export interface ListRxOrdersResponse {
  rxOrders: RxOrder[];
}
