// app/api/admin/GET/denied-users/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, isNotNull, desc, count } from "drizzle-orm";
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    let page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Ensure page is at least 1 to avoid negative skip values
    page = Math.max(1, page);
    const offset = (page - 1) * limit;

    // Build filter: authorized false and denialDate exists (not null)
    const filter = and(
      eq(users.authorized, false),
      isNotNull(users.denialDate),
    );

    // Get total count of denied users for pagination
    const [{ value: totalUsers }] = await db
      .select({ value: count() })
      .from(users)
      .where(filter);

    // Fetch denied users with specified filter and pagination
    const deniedUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        doctorSpecialty: users.doctorSpecialty,
        email: users.email,
        accountType: users.accountType,
        countries: users.countries,
        denialDate: users.denialDate,
      })
      .from(users)
      .where(filter)
      .orderBy(desc(users.denialDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      users: deniedUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching denied users:", error);
    return NextResponse.json(
      { error: "Failed to fetch denied users" },
      { status: 500 },
    );
  }
}
