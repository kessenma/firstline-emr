// app/api/rx-order-qr-code/pharmacy/[uuid]/cancel/route.ts
//
// A pharmacist refusing a prescription: out of stock, wrong dose, cannot be
// dispensed. Their reason is **required** — a script that silently stops
// working at the counter sends the patient back to the clinic to find out why,
// and the reason is what the patient receives on Telegram.
//
// Authenticated by the last-name + DOB gate cookie, not a staff session: an
// outside pharmacy has no MedFlow account.

import { NextRequest, NextResponse } from "next/server";
import { loadGatedOrder } from "@/lib/rx-access-gate";
import { cancelPrescription } from "@/lib/rx-cancellation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;

    const gated = await loadGatedOrder("pharmacy", uuid);
    if (!gated) {
      return NextResponse.json({ error: "rejected" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : null;

    const result = await cancelPrescription({
      rxOrder: gated.rxOrder,
      patient: gated.patient,
      role: "pharmacist",
      // No users row: the pharmacist is outside the organisation, so the
      // clinic signs the patient's message and the whole care team is notified.
      actor: null,
      reason,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Could not cancel", reason: result.reason },
        { status: result.reason === "already-cancelled" ? 409 : 422 },
      );
    }

    return NextResponse.json({
      success: true,
      rxOrder: result.rxOrder,
      notifiedPatient: result.notifiedPatient,
    });
  } catch (error) {
    console.error("[POST pharmacy cancel] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel prescription", reason: "unknown" },
      { status: 500 },
    );
  }
}
