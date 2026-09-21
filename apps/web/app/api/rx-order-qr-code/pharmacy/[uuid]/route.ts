// app/api/rx-order-qr-code/pharmacy/[uuid]/route.ts
// Getting the pharmacy RX order view
//
// Access comes from the cookie POST ./unlock issues after the pharmacist
// confirms the patient's last name and date of birth. It previously required a
// MedFlow session, which no outside pharmacy has — so the QR could only be
// opened by staff, not by the pharmacist it was printed for.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rxOrders } from "@/db/schema";
import { loadGatedOrder } from "@/lib/rx-access-gate";
import { isPrescriptionCancelled } from "@fajr/shared/medications";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;

    const gated = await loadGatedOrder("pharmacy", uuid);
    if (!gated) {
      return NextResponse.json({ error: "rejected" }, { status: 401 });
    }

    return NextResponse.json({
      rxOrder: gated.rxOrder,
      patientId: gated.patient.id,
    });
  } catch (error) {
    console.error("Error fetching RX order:", error);
    return NextResponse.json({ error: "rejected" }, { status: 401 });
  }
}

/** Fields a pharmacist may set. Everything else on the order is off limits. */
const RX_STATUSES = [
  "not reviewed",
  "partially filled",
  "declined",
  "completed",
] as const;

/**
 * Records fulfilment.
 *
 * A dedicated endpoint rather than the generic `PATCH /api/patient/{id}`,
 * which the pharmacy view used to call: that route accepts the whole patient
 * record, and exposing it to a party holding only a surname and a date of
 * birth would hand them write access to the entire chart. This one writes four
 * columns on one order and nothing else.
 */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;

    const gated = await loadGatedOrder("pharmacy", uuid);
    if (!gated) {
      return NextResponse.json({ error: "rejected" }, { status: 401 });
    }

    // Cancelled is not the same as dispensed, so it needs its own guard —
    // `submitted` stays false on a withdrawn script.
    if (isPrescriptionCancelled(gated.rxOrder)) {
      return NextResponse.json(
        { error: "This prescription has been cancelled", reason: "cancelled" },
        { status: 409 },
      );
    }

    // An order already marked completed is final — reopening it is a clinic
    // decision, not a pharmacy one.
    if (gated.rxOrder.submitted) {
      return NextResponse.json(
        { error: "This prescription has already been dispensed" },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const rxStatus = RX_STATUSES.includes(body?.rxStatus)
      ? (body.rxStatus as (typeof RX_STATUSES)[number])
      : null;

    if (!rxStatus) {
      return NextResponse.json({ error: "Invalid rxStatus" }, { status: 400 });
    }

    const rxDispenserName =
      typeof body?.rxDispenserName === "string" ? body.rxDispenserName.trim() : "";
    const rxDispenserContact =
      typeof body?.rxDispenserContact === "string"
        ? body.rxDispenserContact.trim()
        : "";

    if (!rxDispenserName || !rxDispenserContact) {
      return NextResponse.json(
        { error: "Dispenser name and contact are required" },
        { status: 400 },
      );
    }

    const submitted = rxStatus === "completed";
    const now = new Date();

    const [updated] = await db
      .update(rxOrders)
      .set({
        rxStatus,
        rxDispenserName,
        rxDispenserContact,
        partialRxNotes:
          typeof body?.partialRxNotes === "string" ? body.partialRxNotes : null,
        submitted,
        // Clearing the QR on fulfilment is what stops one code being presented
        // at a second pharmacy. Mirrors the behaviour of the staff PATCH route.
        ...(submitted ? { pharmacyQrCode: null, pharmacyQrUrl: null } : {}),
        updatedAt: now,
      })
      .where(eq(rxOrders.id, gated.rxOrder.id))
      .returning();

    return NextResponse.json({ success: true, rxOrder: updated });
  } catch (error) {
    console.error("Error updating RX order:", error);
    return NextResponse.json(
      { error: "Failed to update prescription" },
      { status: 500 },
    );
  }
}
