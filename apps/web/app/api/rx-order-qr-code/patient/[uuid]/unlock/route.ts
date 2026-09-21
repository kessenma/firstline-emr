// app/api/rx-order-qr-code/patient/[uuid]/unlock/route.ts
//
// The patient access gate. POST the 6-digit code from the chat; get the
// prescription back plus a 30-minute cookie for reloads.
//
// This being a POST is load-bearing beyond REST tidiness: messaging apps fetch
// link previews, so stamping "opened" from a GET would mark prescriptions read
// that no human ever saw. A preview crawler never posts.

import { NextRequest, NextResponse } from "next/server";
import { attemptAccess } from "@/lib/rx-access-gate";
import { clientIpFrom } from "@/lib/rx-access-policy";
import { toPatientRxPublicView } from "@/lib/rx-order-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await props.params;
    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : undefined;

    const result = await attemptAccess({
      uuid,
      gate: "patient",
      code,
      ip: clientIpFrom(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
      // One status for every rejection. A different code for "no such
      // prescription" would turn this endpoint into an existence oracle.
      switch (result.reason) {
        case "throttled":
          return NextResponse.json(
            { error: "throttled", retryAfterMs: result.retryAfterMs },
            { status: 429 },
          );
        case "ip-throttled":
          return NextResponse.json({ error: "throttled" }, { status: 429 });
        case "locked":
          return NextResponse.json({ error: "locked" }, { status: 423 });
        default:
          return NextResponse.json({ error: "rejected" }, { status: 401 });
      }
    }

    return NextResponse.json(
      toPatientRxPublicView(result.patient, result.rxOrder),
    );
  } catch (error) {
    console.error("[POST rx unlock] Error:", error);
    return NextResponse.json({ error: "rejected" }, { status: 401 });
  }
}
