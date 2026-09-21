// app/api/patient/[id]/medications/rx-order/[rxOrderId]/access-log/route.ts
//
// Recent access attempts on a prescription link, for the detail panel behind
// the suspicious-activity badge.
//
// The synced `patientLinkFailedCount` tells staff *that* something is off;
// this tells them enough to judge what — a patient fumbling the same code for
// two minutes looks nothing like fifty attempts from four sources.

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rxOrders, rxOrderAccessAttempts } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";

export const dynamic = "force-dynamic";

const MAX_ROWS = 50;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; rxOrderId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId, rxOrderId } = await props.params;

    // Scoped through the patient so a staff member cannot read the log of an
    // order by guessing ids against a patient they do have access to.
    const [rxOrder] = await db
      .select({ id: rxOrders.id })
      .from(rxOrders)
      .where(and(eq(rxOrders.id, rxOrderId), eq(rxOrders.patientId, patientId)))
      .limit(1);

    if (!rxOrder) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    const attempts = await db
      .select({
        id: rxOrderAccessAttempts.id,
        gate: rxOrderAccessAttempts.gate,
        succeeded: rxOrderAccessAttempts.succeeded,
        // ipHash, not ip: enough to tell one source from another, not enough
        // to identify anyone.
        ipHash: rxOrderAccessAttempts.ipHash,
        userAgent: rxOrderAccessAttempts.userAgent,
        createdAt: rxOrderAccessAttempts.createdAt,
      })
      .from(rxOrderAccessAttempts)
      .where(eq(rxOrderAccessAttempts.rxOrderId, rxOrder.id))
      .orderBy(desc(rxOrderAccessAttempts.createdAt))
      .limit(MAX_ROWS);

    return NextResponse.json({
      attempts,
      // So the panel can say "showing the 50 most recent" rather than implying
      // this is everything.
      truncated: attempts.length === MAX_ROWS,
    });
  } catch (error) {
    console.error("[GET rx access-log] Error:", error);
    return NextResponse.json(
      { error: "Failed to load access log" },
      { status: 500 },
    );
  }
}
