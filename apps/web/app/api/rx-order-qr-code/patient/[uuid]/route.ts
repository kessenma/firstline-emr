// app/api/rx-order-qr-code/patient/[uuid]/route.ts
//
// Re-reads a prescription for a browser that already passed the access gate,
// so a reload does not force the patient to re-enter their code.
//
// This route used to be fully public and returned the patient's name, date of
// birth, city, diagnosis and medications to anyone holding — or guessing — the
// URL. Access now comes from the cookie that POST ./unlock issues; without it
// the answer is 401, and identical for a uuid that does not exist.

import { NextResponse } from "next/server";
import { loadGatedOrder } from "@/lib/rx-access-gate";
import { toPatientRxPublicView } from "@/lib/rx-order-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;

    const gated = await loadGatedOrder("patient", uuid);
    if (!gated) {
      return NextResponse.json({ error: "rejected" }, { status: 401 });
    }

    return NextResponse.json(
      toPatientRxPublicView(gated.patient, gated.rxOrder),
    );
  } catch (error) {
    console.error("Error fetching RX order:", error);
    return NextResponse.json({ error: "rejected" }, { status: 401 });
  }
}
