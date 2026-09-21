// apps/web/lib/rx-cancellation.ts
//
// Withdrawing a prescription, for all three parties who can do it.
//
// One implementation behind three differently-authenticated routes. Split into
// three copies, "write the columns, clear the QR, tell the patient, tell the
// team" drifts — and the failure mode of that drift is a patient who was never
// told their script is dead, or a care team who never found out.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rxOrders, type Patient, type RxOrder } from "@/db/schema";
import {
  buildCancellationTelegramPayload,
  describePatientReasonCode,
  isPrescriptionCancelled,
  validateCancellation,
  type PatientCancellationReasonCode,
  type RxCancellerRole,
} from "@fajr/shared/medications";
import { notificationService } from "@/lib/NotificationService";
import { getCareTeamRecipients } from "@/lib/server/careTeamRecipients";
import { getTelegramThreadByChatId } from "@/lib/telegram-db-helpers";
import { sendTelegramText } from "@/lib/telegram-send";
import { resolveSenderIdentity } from "@/lib/telegram-sender-identity";

export type CancelPrescriptionFailure =
  | "already-cancelled"
  | "reason-required";

export type CancelPrescriptionResult =
  | { ok: true; rxOrder: RxOrder; notifiedPatient: boolean }
  | { ok: false; reason: CancelPrescriptionFailure };

export interface CancelPrescriptionInput {
  rxOrder: RxOrder;
  patient: Patient;
  role: RxCancellerRole;
  /** The acting staff member. Null for a patient — they have no users row. */
  actor: { userId: string; email?: string | null } | null;
  reason?: string | null;
  reasonCode?: PatientCancellationReasonCode | null;
}

/** How the care team sees the actor named in their notification. */
const ROLE_HEADLINE: Record<RxCancellerRole, string> = {
  doctor: "Prescription cancelled by the prescriber",
  pharmacist: "Prescription cancelled by the pharmacy",
  patient: "Prescription cancelled by the patient",
};

export async function cancelPrescription({
  rxOrder,
  patient,
  role,
  actor,
  reason,
  reasonCode,
}: CancelPrescriptionInput): Promise<CancelPrescriptionResult> {
  // Terminal by design. A second cancellation would fire a second Telegram
  // message and a second notification for something that already happened.
  if (isPrescriptionCancelled(rxOrder)) {
    return { ok: false, reason: "already-cancelled" };
  }

  // Enforced here as well as in the form: the pharmacist's reason is a rule
  // about the record, not about the UI, and two of the three callers are
  // reached without a staff session.
  const validation = validateCancellation(role, { reason, reasonCode });
  if (!validation.ok) {
    return { ok: false, reason: validation.error };
  }

  const trimmedReason = reason?.trim() || null;
  const now = new Date();

  const [updated] = await db
    .update(rxOrders)
    .set({
      cancelledAt: now,
      cancelledByRole: role,
      cancelledByUserId: actor?.userId ?? null,
      cancellationReason: trimmedReason,
      cancellationReasonCode: reasonCode ?? null,
      // Same clearing fulfilment does: a cancelled script whose QR still scans
      // is the entire problem this feature exists to solve.
      pharmacyQrCode: null,
      pharmacyQrUrl: null,
      updatedAt: now,
    })
    .where(eq(rxOrders.id, rxOrder.id))
    .returning();

  const cancelled = updated ?? rxOrder;

  // A patient who cancelled it themselves does not need telling.
  const notifiedPatient =
    role === "patient"
      ? false
      : await tellPatient({ patient, role, reason: trimmedReason, actor });

  await tellCareTeam({
    patient,
    rxOrder: cancelled,
    role,
    actorUserId: actor?.userId ?? null,
    reason: trimmedReason,
    reasonCode: reasonCode ?? null,
  });

  return { ok: true, rxOrder: cancelled, notifiedPatient };
}

/**
 * Messages the patient over their channel.
 *
 * Best-effort: the cancellation is already written and the care team still has
 * to hear about it. A messaging failure must not roll that back, but it does
 * come back as `notifiedPatient: false` so the clinician is told the patient
 * was not reached and can call them.
 */
async function tellPatient({
  patient,
  role,
  reason,
  actor,
}: {
  patient: Patient;
  role: "doctor" | "pharmacist";
  reason: string | null;
  actor: { userId: string; email?: string | null } | null;
}): Promise<boolean> {
  const chatId = patient.telegramChatId?.trim();
  if (!chatId) return false;

  try {
    const thread = await getTelegramThreadByChatId(chatId);
    if (!thread) return false;

    const payload = buildCancellationTelegramPayload({
      language: patient.language,
      role,
      reason,
    });

    // A pharmacist has no MedFlow account, so there is no users row to sign as
    // — the clinic signs instead, which is also who the patient should contact.
    const identity = actor
      ? await resolveSenderIdentity(actor)
      : { senderName: "Fajr Mission", senderId: null };

    await sendTelegramText({
      chatId,
      text: payload.text,
      senderName: identity.senderName,
      senderId: identity.senderId,
      signatureMode: payload.signatureMode,
    });

    return true;
  } catch (error) {
    console.error("[rx-cancellation] Failed to message the patient:", error);
    return false;
  }
}

/** Notifies every active care team member except whoever cancelled. */
async function tellCareTeam({
  patient,
  rxOrder,
  role,
  actorUserId,
  reason,
  reasonCode,
}: {
  patient: Patient;
  rxOrder: RxOrder;
  role: RxCancellerRole;
  actorUserId: string | null;
  reason: string | null;
  reasonCode: string | null;
}): Promise<void> {
  try {
    const recipientIds = await getCareTeamRecipients(patient.id, actorUserId);
    if (recipientIds.length === 0) return;

    // A patient's preset code is rendered in English here — they chose it in
    // their own language, and this is what staff read.
    const presetLabel = describePatientReasonCode(reasonCode);
    const detail =
      presetLabel && reason
        ? `${presetLabel} — ${reason}`
        : (presetLabel ?? reason);

    const patientName = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();

    await notificationService.send({
      // An existing enum value, and already wired to open the patient chart on
      // mobile for both the in-app list and a push tap. `category` carries the
      // detail for any bespoke UI later.
      type: "patient_update",
      category: "patient_action",
      title: ROLE_HEADLINE[role],
      message: detail
        ? `${patientName || "A patient"}'s prescription was cancelled: ${detail}`
        : `${patientName || "A patient"}'s prescription was cancelled.`,
      recipientIds,
      patientId: patient.id,
      sourceId: rxOrder.id,
      redirectTo: `/patient/${patient.id}?section=medications`,
    });
  } catch (error) {
    // The cancellation itself succeeded; failing the request now would tell the
    // caller nothing happened when the script is already withdrawn.
    console.error("[rx-cancellation] Failed to notify the care team:", error);
  }
}
