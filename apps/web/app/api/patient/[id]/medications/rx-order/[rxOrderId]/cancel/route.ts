// app/api/patient/[id]/medications/rx-order/[rxOrderId]/cancel/route.ts
//
// A clinician withdrawing a prescription. Their reason is optional — they are
// already named in the record and can be asked — but if they give one it goes
// to the patient verbatim, which both confirm dialogs say before the box.

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, rxOrders } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { cancelPrescription } from "@/lib/rx-cancellation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; rxOrderId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId, rxOrderId } = await props.params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : null;

    // Matched together so an order cannot be cancelled through a mismatched
    // patient id by someone who only has access to the other chart.
    const [rxOrder] = await db
      .select()
      .from(rxOrders)
      .where(and(eq(rxOrders.id, rxOrderId), eq(rxOrders.patientId, patientId)))
      .limit(1);

    if (!rxOrder) {
      return NextResponse.json(
        { error: "Prescription not found", reason: "not-found" },
        { status: 404 },
      );
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found", reason: "not-found" },
        { status: 404 },
      );
    }

    const result = await cancelPrescription({
      rxOrder,
      patient,
      role: "doctor",
      actor: { userId: session.userId, email: session.email },
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
    console.error("[POST rx cancel] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel prescription", reason: "unknown" },
      { status: 500 },
    );
  }
}
