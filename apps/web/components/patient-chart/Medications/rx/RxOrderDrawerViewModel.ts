// apps/web/components/patient-chart/Medications/rx/RxOrderDrawerViewModel.ts

import { useEffect, useMemo, useState } from "react";
import {
  describePrescriptionCancellation,
  describePrescriptionDelivery,
  getPrescriptionLink,
  hasSentPrescriptionLink,
  isPrescriptionCancelled,
  prescriptionCancelToast,
  type PrescriptionCancelFailureReason,
  prescriptionLinkCopiedToast,
  prescriptionMissingLinkToast,
  prescriptionSendToast,
  type PrescriptionSendFailureReason,
  type RxOrder,
} from "@fajr/shared/medications";
import { getPatientChannel } from "@fajr/shared/messaging";
import { useToast } from "@/components/hooks/useToast";

export type RxSendState = "idle" | "sending" | "sent" | "failed";
export type RxCancelState = "idle" | "cancelling" | "cancelled" | "failed";

export function useRxOrderDrawerViewModel(
  initialRxOrder: RxOrder | null,
  patientId: string | undefined,
  telegramChatId?: string | null,
) {
  const [rxOrder, setRxOrder] = useState<RxOrder | null>(null);
  const [sendState, setSendState] = useState<RxSendState>("idle");
  const [cancelState, setCancelState] = useState<RxCancelState>("idle");
  const { setToast } = useToast();

  useEffect(() => {
    if (initialRxOrder) {
      setRxOrder(initialRxOrder);
      // A different prescription is a different send, and a different cancel.
      setSendState("idle");
      setCancelState("idle");
    }
  }, [initialRxOrder]);

  const patientRxUrl = getPrescriptionLink(rxOrder);

  const delivery = useMemo(
    () => describePrescriptionDelivery(rxOrder ?? {}),
    [rxOrder],
  );

  // The local state covers the moment between a successful send and the
  // refreshed row arriving.
  const alreadySent = hasSentPrescriptionLink(rxOrder) || sendState === "sent";

  const channel = getPatientChannel({ telegramChatId });

  const cancellation = describePrescriptionCancellation(rxOrder ?? {});
  const cancelled = isPrescriptionCancelled(rxOrder ?? {});

  const copyLink = () => {
    if (!patientRxUrl) {
      setToast(prescriptionMissingLinkToast());
      return;
    }

    navigator.clipboard.writeText(patientRxUrl);
    setToast(prescriptionLinkCopiedToast());
  };

  /**
   * Sends the link to the patient over their messaging channel.
   *
   * Replaces the old `copyMessage`, which wrote the message to the clipboard
   * while its button read like a send. One server call both delivers and
   * records the send, so the greyed-out state cannot disagree with reality.
   */
  const sendToPatient = async (): Promise<boolean> => {
    if (!rxOrder || !patientId) return false;

    setSendState("sending");

    try {
      const response = await fetch(
        `/api/patient/${patientId}/medications/rx-order/${rxOrder.id}/send-to-patient`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );

      if (response.ok) {
        const data = await response.json();
        // Patched from the response rather than refetched, so the button and
        // the delivery line update together.
        if (data?.rxOrder) setRxOrder(data.rxOrder as RxOrder);
        setSendState("sent");
        setToast(
          prescriptionSendToast({ ok: true, channel: channel ?? "telegram" }),
        );
        return true;
      }

      const body = await response.json().catch(() => ({}));
      const reason: PrescriptionSendFailureReason =
        body?.reason === "no-channel" ||
        body?.reason === "no-thread" ||
        body?.reason === "missing-link"
          ? body.reason
          : "unknown";

      setSendState("failed");
      setToast(prescriptionSendToast({ ok: false, reason }));
      return false;
    } catch {
      setSendState("failed");
      setToast(prescriptionSendToast({ ok: false, reason: "offline" }));
      return false;
    }
  };

  /**
   * Withdraws the prescription.
   *
   * `onCancelled` exists because this view model holds its own copy of the
   * order: the medication lists read from `usePatientDashboard()` and would go
   * on showing a withdrawn script as live. The caller passes
   * `refreshMedications` so both update together.
   */
  const cancelPrescription = async (
    reason: string,
    onCancelled?: () => void,
  ): Promise<boolean> => {
    if (!rxOrder || !patientId) return false;

    setCancelState("cancelling");

    try {
      const response = await fetch(
        `/api/patient/${patientId}/medications/rx-order/${rxOrder.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.rxOrder) setRxOrder(data.rxOrder as RxOrder);
        setCancelState("cancelled");
        setToast(
          prescriptionCancelToast({
            ok: true,
            notifiedPatient: !!data?.notifiedPatient,
          }),
        );
        onCancelled?.();
        return true;
      }

      const body = await response.json().catch(() => ({}));
      const reasonCode: PrescriptionCancelFailureReason =
        body?.reason === "already-cancelled" ||
        body?.reason === "reason-required" ||
        body?.reason === "not-found"
          ? body.reason
          : "unknown";

      setCancelState("failed");
      setToast(prescriptionCancelToast({ ok: false, reason: reasonCode }));
      return false;
    } catch {
      setCancelState("failed");
      setToast(prescriptionCancelToast({ ok: false, reason: "offline" }));
      return false;
    }
  };

  return {
    rxOrder,
    patientRxUrl,
    delivery,
    cancellation,
    cancelled,
    cancelState,
    cancelPrescription,
    alreadySent,
    sendState,
    copyLink,
    sendToPatient,
  };
}
