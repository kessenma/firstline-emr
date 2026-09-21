import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq, ilike, desc, sql, and, or, gte, lte, isNotNull, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    const id = searchParams.get("id");
    const source = searchParams.get("source"); // "telegram" | "manual"
    const specialty = searchParams.get("specialty");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const conditions: any[] = [];

    // ID search (exact match)
    if (id) {
      conditions.push(eq(patients.id, id));
    }

    // Name search (ilike on first + last name)
    if (q && q.trim().length >= 2) {
      const term = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(patients.firstName, term),
          ilike(patients.lastName, term),
        ),
      );
    }

    // Source filter
    if (source === "telegram") {
      conditions.push(isNotNull(patients.telegramChatId));
    } else if (source === "manual") {
      conditions.push(isNull(patients.telegramChatId));
    }

    // Specialty filter (ANY match on text array)
    if (specialty) {
      conditions.push(sql`${specialty} = ANY(${patients.specialties})`);
    }

    // Status filter
    if (status) {
      conditions.push(eq(patients.status, status as any));
    }

    // Priority filter
    if (priority) {
      conditions.push(eq(patients.priority, priority as any));
    }

    // Date range filters
    if (dateFrom) {
      conditions.push(gte(patients.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(patients.createdAt, new Date(dateTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        status: patients.status,
        priority: patients.priority,
        specialties: patients.specialties,
        hospital: patients.hospital,
        createdAt: patients.createdAt,
        telegramChatId: patients.telegramChatId,
        chiefComplaint: patients.chiefComplaint,
        diagnosis: patients.diagnosis,
      })
      .from(patients)
      .where(where)
      .orderBy(desc(patients.createdAt))
      .limit(30);

    const mapped = results.map((r) => ({
      ...r,
      hasTelegram: !!r.telegramChatId,
      telegramChatId: undefined,
    }));

    return NextResponse.json({ patients: mapped, count: mapped.length });
  } catch (error) {
    console.error("Error searching patients:", error);
    return NextResponse.json(
      { error: "Failed to search patients" },
      { status: 500 },
    );
  }
}
