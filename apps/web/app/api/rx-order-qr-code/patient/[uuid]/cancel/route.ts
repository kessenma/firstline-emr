// app/api/rx-order-qr-code/patient/[uuid]/cancel/route.ts
//
// A patient withdrawing their own prescription — they filled it elsewhere,
// reacted badly, or no longer need it.
//
// They pick from a short list rather than typing: they are on a phone, often in
// a second language, and the care team needs something consistent to scan. The
// stored code is language-neutral, so staff read it in English whatever the
// patient answered in. An optional note carries anything the list misses.
//
// No Telegram message goes out — they are the one who cancelled it.

import { NextRequest, NextResponse } from "next/server";
import { loadGatedOrder } from "@/lib/rx-access-gate";
import { cancelPrescription } from "@/lib/rx-cancellation";
import { isPatientCancellationReasonCode } from "@fajr/shared/medications";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;

    const gated = await loadGatedOrder("patient", uuid);
    if (!gated) {
      return NextResponse.json({ error: "rejected" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reasonCode = isPatientCancellationReasonCode(body?.reasonCode)
      ? body.reasonCode
      : null;
    const reason = typeof body?.note === "string" ? body.note : null;

    const result = await cancelPrescription({
      rxOrder: gated.rxOrder,
      patient: gated.patient,
      role: "patient",
      actor: null,
      reason,
      reasonCode,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Could not cancel", reason: result.reason },
        { status: result.reason === "already-cancelled" ? 409 : 422 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST patient cancel] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel prescription", reason: "unknown" },
      { status: 500 },
    );
  }
}
