/**
 * Wire format for the `patient-card` internal message type.
 *
 * This payload is JSON-stringified into `internal_messages.text`. It is built on
 * web and mobile, stored by the API, and rendered by both clients — so it is the
 * one shape that must not drift. Always go through the codec in `./codec`
 * rather than hand-building the object: senders previously disagreed about
 * whether absent fields were `null` or `''`, and both renderers declared
 * incompatible types for the result.
 */
export interface PatientCardPayload {
  patientId: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  priority: string | null;
  specialties: string[] | null;
  hospital: string | null;
  chiefComplaint: string | null;
  diagnosis: string | null;
}

/**
 * NOTE: the payload deliberately does NOT carry `careTeam`. Care-team
 * membership changes after a card is sent, so a snapshot would go stale and the
 * chart-access gate would decide on old data. Recipients resolve the live
 * patient (PowerSync on mobile, the chart page on web) before gating.
 */

/**
 * Loose input accepted by `buildPatientCardPayload`.
 *
 * Deliberately permissive so a patient object from either app — or a parsed,
 * untrusted JSON blob off the wire — can be passed straight in. `id` and
 * `patientId` are both accepted because web patient objects use `id` while the
 * card payload itself uses `patientId`.
 */
export interface PatientCardSource {
  id?: string | null;
  patientId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
  priority?: string | null;
  specialties?: string[] | null;
  hospital?: string | null;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
}
