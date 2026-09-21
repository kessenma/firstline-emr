// app/api/admin/GET/call-logs/route.ts
// Global staff-call log for admins.
//
// Distinct from /api/calls/user/[userId], which is one person's history through
// getCallHistory(). This is every call on the system, so it is paginated by
// offset (admins jump around pages) rather than by the cursor the Recents list
// uses, and it hydrates *all* participants rather than "everyone except me".
//
// Not an extension of userProfileLogs: that table is a field-level diff and
// cannot represent a call. Read from `calls` instead.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { calls, callParticipants, users } from "@/db/schema";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;

  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : 50;

  const status = searchParams.get("status");
  const days = Number(searchParams.get("days") ?? 0);

  try {
    const conditions = [];

    // Only accept a value the enum actually has — an unknown string would make
    // Postgres error on the comparison rather than return an empty page.
    const VALID_STATUSES = [
      "ringing",
      "active",
      "completed",
      "missed",
      "declined",
      "canceled",
      "failed",
    ] as const;
    type CallStatus = (typeof VALID_STATUSES)[number];
    if (status && VALID_STATUSES.includes(status as CallStatus)) {
      conditions.push(eq(calls.status, status as CallStatus));
    }

    if (Number.isFinite(days) && days > 0) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      conditions.push(gte(calls.startedAt, since));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(calls)
      .where(where);

    const total = countRow?.count ?? 0;

    const rows = await db
      .select({
        id: calls.id,
        kind: calls.kind,
        status: calls.status,
        initiatorId: calls.initiatorId,
        isGroupCall: calls.isGroupCall,
        startedAt: calls.startedAt,
        answeredAt: calls.answeredAt,
        endedAt: calls.endedAt,
        durationSeconds: calls.durationSeconds,
        endReason: calls.endReason,
      })
      .from(calls)
      .where(where)
      .orderBy(desc(calls.startedAt))
      .limit(limit)
      .offset((page - 1) * limit);

    if (rows.length === 0) {
      return NextResponse.json({
        calls: [],
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    // Hydrate participants in one round trip rather than per call, mirroring
    // getCallHistory().
    const callIds = rows.map((r) => r.id);
    const participants = await db
      .select({
        callId: callParticipants.callId,
        userId: callParticipants.userId,
        role: callParticipants.role,
        status: callParticipants.status,
        joinedAt: callParticipants.joinedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        image: users.image,
        accountType: users.accountType,
      })
      .from(callParticipants)
      .innerJoin(users, eq(users.id, callParticipants.userId))
      .where(inArray(callParticipants.callId, callIds));

    const byCall = new Map<string, typeof participants>();
    for (const p of participants) {
      const list = byCall.get(p.callId) ?? [];
      list.push(p);
      byCall.set(p.callId, list);
    }

    return NextResponse.json({
      calls: rows.map((r) => {
        const people = byCall.get(r.id) ?? [];
        const caller = people.find((p) => p.userId === r.initiatorId);
        return {
          callId: r.id,
          kind: r.kind,
          status: r.status,
          isGroupCall: r.isGroupCall,
          startedAt: r.startedAt,
          answeredAt: r.answeredAt,
          endedAt: r.endedAt,
          durationSeconds: r.durationSeconds,
          endReason: r.endReason,
          caller: caller
            ? {
                id: caller.userId,
                name: `${caller.firstName} ${caller.lastName}`.trim(),
                email: caller.email,
                image: caller.image,
                accountType: caller.accountType,
              }
            : null,
          callees: people
            .filter((p) => p.role === "callee")
            .map((p) => ({
              id: p.userId,
              name: `${p.firstName} ${p.lastName}`.trim(),
              email: p.email,
              image: p.image,
              accountType: p.accountType,
              status: p.status,
              joinedAt: p.joinedAt,
            })),
        };
      }),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching admin call logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
