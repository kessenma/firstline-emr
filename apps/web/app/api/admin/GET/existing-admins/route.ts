// app/api/admin/GET/existing-admins/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    // Verify admin access using DAL
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      console.log("Unauthorized access attempted");
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    console.log("Authorized admin session:", session.email);

    // Fetch admins with user data using JOIN
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
      .orderBy(desc(admins.adminStartDate));

    console.log("Admins data fetched from database:", adminsList);

    return NextResponse.json({ admins: adminsList }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { message: "Failed to fetch admins" },
      { status: 500 },
    );
  }
}
