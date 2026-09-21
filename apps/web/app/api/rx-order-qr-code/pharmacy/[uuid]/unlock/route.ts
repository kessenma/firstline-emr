// app/api/rx-order-qr-code/pharmacy/[uuid]/unlock/route.ts
//
// The pharmacy access gate: the pharmacist confirms the patient's last name
// and date of birth, both of which they can read off the person standing in
// front of them and neither of which is in the QR code.
//
// This replaces a `verifySessionFromRequest` check on the pharmacy view. That
// check required a MedFlow account, which no outside pharmacy has — so the QR
// code could not actually be used by its intended audience.

import { NextRequest, NextResponse } from "next/server";
import { attemptAccess } from "@/lib/rx-access-gate";
import { clientIpFrom } from "@/lib/rx-access-policy";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;
    const body = await request.json().catch(() => ({}));

    const result = await attemptAccess({
      uuid,
      gate: "pharmacy",
      lastName: typeof body?.lastName === "string" ? body.lastName : undefined,
      dob: typeof body?.dob === "string" ? body.dob : undefined,
      ip: clientIpFrom(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
      if (result.reason === "throttled") {
        return NextResponse.json(
          { error: "throttled", retryAfterMs: result.retryAfterMs },
          { status: 429 },
        );
      }
      if (result.reason === "ip-throttled") {
        return NextResponse.json({ error: "throttled" }, { status: 429 });
      }
      return NextResponse.json({ error: "rejected" }, { status: 401 });
    }

    // The pharmacy view edits the order (dispenser details, status), so unlike
    // the patient view it needs the row itself rather than a projection.
    return NextResponse.json({
      rxOrder: result.rxOrder,
      patientId: result.patient.id,
    });
  } catch (error) {
    console.error("[POST pharmacy unlock] Error:", error);
    return NextResponse.json({ error: "rejected" }, { status: 401 });
  }
}
