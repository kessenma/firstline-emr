import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, or, ilike, eq, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await verifySessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const searchPattern = `%${query}%`;

    const results = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        accountType: users.accountType,
        image: users.image,
      })
      .from(users)
      .where(
        and(
          eq(users.authorized, true),
          ne(users.id, session.userId),
          or(
            ilike(users.email, searchPattern),
            ilike(users.firstName, searchPattern),
            ilike(users.lastName, searchPattern),
          ),
        ),
      )
      .limit(10);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
