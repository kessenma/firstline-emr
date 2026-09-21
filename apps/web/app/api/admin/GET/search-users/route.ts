// app/api/admin/GET/search-users/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Accept ?query= (preferred) or ?email= (backward compat)
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("email");

    if (!query) {
      return NextResponse.json(
        { message: "Search query is required" },
        { status: 400 },
      );
    }

    // Search by email, first name, or last name (case-insensitive)
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        accountType: users.accountType,
      })
      .from(users)
      .where(
        and(
          eq(users.authorized, true),
          or(
            ilike(users.email, `%${query}%`),
            ilike(users.firstName, `%${query}%`),
            ilike(users.lastName, `%${query}%`),
          ),
        ),
      )
      .limit(10);

    return NextResponse.json({ users: usersList }, { status: 200 });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { message: "Failed to search users" },
      { status: 500 },
    );
  }
}
