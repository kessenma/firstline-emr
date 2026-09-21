// app/api/users/directory/route.ts
// Browsable staff directory backing the Contacts tab of the call dialog.
//
// Deliberately NOT a change to /api/users/search: that route is contracted to
// return at most 10 rows and nothing at all for queries shorter than two
// characters, and both web and mobile `UserSearchInput` rely on exactly that
// (it is what stops the type-ahead dropdown from opening on the first
// keystroke). A directory needs the opposite behaviour — list everyone when the
// query is empty, and page through the result — so it gets its own route.
//
// The visibility predicate is kept identical to /api/users/search: authorized
// staff only, never the requesting user.
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, or, ilike, eq, ne, asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "").trim();

  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const offset =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.trunc(rawOffset) : 0;

  try {
    const conditions = [
      eq(users.authorized, true),
      ne(users.id, session.userId),
    ];

    // Unlike /api/users/search there is no minimum length — a single character
    // is a legitimate way to jump down an alphabetical directory.
    if (query.length > 0) {
      // Escape LIKE metacharacters so a literal % doesn't match everything.
      const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
      const pattern = `%${escaped}%`;
      conditions.push(
        or(
          ilike(users.email, pattern),
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          // Lets "jane doe" match across the two columns, which is what people
          // actually type when searching a directory by full name.
          ilike(
            sql`${users.firstName} || ' ' || ${users.lastName}`,
            pattern,
          ),
        )!,
      );
    }

    // Optional narrowing for the "send patient to…" recipient picker. Added
    // here rather than as new routes so the auth, paging and search behaviour
    // stay in one place. All three read `users`, the source of truth.
    const accountType = searchParams.get("accountType")?.trim();
    if (accountType) {
      conditions.push(eq(users.accountType, accountType as any));
    }

    const missionId = searchParams.get("missionId")?.trim();
    if (missionId) {
      conditions.push(sql`${users.missions} @> ARRAY[${missionId}]::text[]`);
    }

    const specialty = searchParams.get("specialty")?.trim();
    if (specialty) {
      conditions.push(
        sql`${users.doctorSpecialty} @> ARRAY[${specialty}]::text[]`,
      );
    }

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        accountType: users.accountType,
        image: users.image,
        doctorSpecialty: users.doctorSpecialty,
        // Needed by the "Doctors on this mission" tab.
        missions: users.missions,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.lastName), asc(users.firstName), asc(users.id))
      .limit(limit + 1) // one extra row tells us whether another page exists
      .offset(offset);

    const hasMore = rows.length > limit;

    return NextResponse.json({
      users: hasMore ? rows.slice(0, limit) : rows,
      nextOffset: hasMore ? offset + limit : null,
    });
  } catch (error) {
    console.error("Error loading user directory:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
