// apps/web/db/schema/shared-types.contract.ts
//
// Compile-time bridge between the Drizzle rows and the cross-platform contracts
// in `@fajr/shared` (medications and notes). Mobile reads the same records over
// PowerSync and cannot see this schema, so a column that is renamed, dropped,
// or narrowed here would otherwise drift silently until it broke on a device.
//
// This file has no runtime output — it only fails `tsc` if the shapes diverge.
// If a change here trips the assertions below, update the shared types (and the
// PowerSync schema + sync rules) rather than loosening the assertion.

import type { MedOrder as SharedMedOrder, RxOrder as SharedRxOrder } from "@fajr/shared/medications";
import type { NoteBase, NoteEditBase } from "@fajr/shared/patient";
import type { RxOrder as DrizzleRxOrder } from "./patients";
import type { MedOrder as DrizzleMedOrder } from "./medOrders";
import type { Note as DrizzleNote, NoteEdit as DrizzleNoteEdit } from "./notes";

/** Fails to compile unless `T` is assignable to `U`. */
type Extends<T extends U, U> = true;

// Every Drizzle row must satisfy the shared contract. Adding a column is fine;
// removing or retyping one that the shared type declares is not.
export type RxOrderRowSatisfiesContract = Extends<DrizzleRxOrder, SharedRxOrder>;
export type MedOrderRowSatisfiesContract = Extends<DrizzleMedOrder, SharedMedOrder>;

// The fields that carry the patient-facing prescription link must stay present
// and stay strings. Losing these is what silently sent patients a dead link.
type HasLinkFields = Extends<
  DrizzleRxOrder,
  {
    id: string;
    patientRxUrl: string | null;
    pharmacyQrUrl: string | null;
    pharmacyQrCode: string | null;
  }
>;
export type RxOrderRowHasLinkFields = HasLinkFields;

// Delivery + lock state drive the "already sent" / "opened" / "suspicious
// activity" affordances on *both* charts, and mobile reads them over PowerSync.
// Dropping one here would leave the mobile chart rendering a permanently
// un-sent prescription with no error anywhere.
//
// Nothing from `rx_order_access` belongs in this list: the code hash and the
// attempt log are server-only and must never appear in a shared type, since
// anything shared is a candidate for the sync rules.
type HasDeliveryFields = Extends<
  DrizzleRxOrder,
  {
    patientLinkSentAt: Date | null;
    patientLinkOpenedAt: Date | null;
    patientLinkFailedCount: number;
    patientLinkLockState: "ok" | "throttled" | "locked";
  }
>;
export type RxOrderRowHasDeliveryFields = HasDeliveryFields;

// Cancellation drives whether a script can still be sent, dispensed or
// presented. Mobile reads all of it over PowerSync, so dropping one here would
// leave a device showing a withdrawn prescription as live.
type HasCancellationFields = Extends<
  DrizzleRxOrder,
  {
    cancelledAt: Date | null;
    cancelledByRole: "doctor" | "pharmacist" | "patient" | null;
    cancellationReason: string | null;
    cancellationReasonCode: string | null;
  }
>;
export type RxOrderRowHasCancellationFields = HasCancellationFields;

// Notes are read from this schema on web and from PowerSync on mobile, where
// the shape is `NoteBase`. Same reasoning as the medication rows above.
export type NoteRowSatisfiesContract = Extends<DrizzleNote, NoteBase>;
export type NoteEditRowSatisfiesContract = Extends<DrizzleNoteEdit, NoteEditBase>;
