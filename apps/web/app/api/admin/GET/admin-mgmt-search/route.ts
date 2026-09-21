// app/api/admin/GET/admin-mgmt-search/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins, users } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
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

    // Get search parameter
    const search = request.nextUrl.searchParams.get("search");

    // Execute query with optional search filter
    const adminsList = await db
      .select({
        id: admins.id,
        userId: admins.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        adminStartDate: admins.adminStartDate,
      })
      .from(admins)
      .innerJoin(users, eq(admins.userId, users.id))
      .where(search ? ilike(users.email, `%${search}%`) : undefined);

    if (!adminsList || adminsList.length === 0) {
      return NextResponse.json({ message: "No admins found" }, { status: 404 });
    }

    return NextResponse.json({ admins: adminsList }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { message: "Failed to fetch admins" },
      { status: 500 },
    );
  }
}
