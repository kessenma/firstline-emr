// lib/rx-order-helpers.ts
import { db } from "@/db";
import { patients, rxOrders, type Patient, type RxOrder } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";
import type { PatientRxPublicView } from "@fajr/shared/medications";

/**
 * Find patient and RX order by the UUID embedded in the patient/pharmacy URL.
 *
 * SECURITY: the segment is validated as a strict UUID *before* it reaches the
 * query. This used to be `like(column, '%' + uuid + '%')` with no validation at
 * all — a substring match over attacker-controlled input, where `%` and `_` are
 * LIKE wildcards. `GET /api/rx-order-qr-code/patient/%` therefore returned the
 * first prescription in the table (name, DOB, city, diagnosis, medications)
 * from an unauthenticated route, as did any single character. Never interpolate
 * a path segment into a LIKE pattern.
 *
 * The lookup accepts either the `rx_order_id` column or the URL's trailing
 * segment: new orders set both from the same `uuidv4()`, but older rows are not
 * guaranteed to, and a link already in a patient's hands has to keep working.
 * `like` is safe here only because `isValidUuid` has already established the
 * value is hex and dashes, so it carries no wildcards.
 *
 * `urlField` selects which link is being resolved, so a patient link can never
 * be redeemed at the pharmacy gate or vice versa.
 */
export async function findPatientByRxOrderUuid(
  uuid: string,
  urlField: "patientRxUrl" | "pharmacyQrUrl",
): Promise<{
  patient: Patient;
  rxOrder: RxOrder;
} | null> {
  if (!isValidUuid(uuid)) {
    return null;
  }

  const urlColumn =
    urlField === "patientRxUrl" ? rxOrders.patientRxUrl : rxOrders.pharmacyQrUrl;

  const [rxOrder] = await db
    .select()
    .from(rxOrders)
    .where(or(eq(rxOrders.rxOrderId, uuid), like(urlColumn, `%/${uuid}`)))
    .limit(1);

  if (!rxOrder) {
    return null;
  }

  // Get the associated patient
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, rxOrder.patientId))
    .limit(1);

  if (!patient) {
    return null;
  }

  return { patient, rxOrder };
}

/**
 * The patient-facing projection of an order.
 *
 * `satisfies` is load-bearing: this payload and the page that renders it
 * drifted on the QR key's casing (`PharmacyQrCode` here vs `pharmacyQrCode`
 * there), which made every prescription show "QR Code not available". Naming
 * the shared type on both sides turns the next such rename into a build error.
 *
 * Only ever returned past an access gate — see lib/rx-access-gate.ts.
 */
export function toPatientRxPublicView(
  patient: Patient,
  rxOrder: RxOrder,
): PatientRxPublicView {
  return {
    // Patient information
    patientName: `${patient.firstName} ${patient.lastName}`.trim(),
    patientDob: patient.dob,
    patientCountry: patient.country,
    patientCity: patient.city,

    // RX order information
    rxOrderId: rxOrder.rxOrderId,
    pharmacyQrCode: rxOrder.pharmacyQrCode,
    doctorSpecialty: rxOrder.doctorSpecialty,
    prescribingDr: rxOrder.prescribingDr,
    validTill: rxOrder.validTill,
    prescribedDate: rxOrder.prescribedDate,
    city: rxOrder.city,
    rxStatus: rxOrder.rxStatus,
    submitted: rxOrder.submitted,
    prescriptions: rxOrder.prescriptions,

    // The gate opens on a cancelled prescription on purpose, so the patient
    // learns it was withdrawn and why rather than finding a dead QR.
    cancelledAt: rxOrder.cancelledAt,
    cancelledByRole: rxOrder.cancelledByRole,
    cancellationReason: rxOrder.cancellationReason,
    cancellationReasonCode: rxOrder.cancellationReasonCode,
  } satisfies PatientRxPublicView;
}

// `getPatientRxOrderDetails` / `getPharmacyRxOrderDetails` used to live here:
// uuid in, whole prescription out, no access check anywhere. Both routes now go
// through lib/rx-access-gate.ts instead, and these were deleted rather than left
// unused — an ungated "fetch a patient's record by uuid" helper sitting in the
// codebase is how the next route reopens the hole this file just closed.
//
// Use `findPatientByRxOrderUuid` + `toPatientRxPublicView` behind a gate.

/**
 * Update RX order
 */
export async function updateRxOrder(
  rxOrderId: string,
  updateData: Partial<RxOrder>,
): Promise<boolean> {
  try {
    const result = await db
      .update(rxOrders)
      .set(updateData)
      .where(eq(rxOrders.id, rxOrderId))
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error("Error updating RX order:", error);
    return false;
  }
}

/**
 * Get RX orders for a patient
 */
export async function getRxOrdersForPatient(
  patientId: string,
): Promise<RxOrder[]> {
  return await db
    .select()
    .from(rxOrders)
    .where(eq(rxOrders.patientId, patientId));
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
