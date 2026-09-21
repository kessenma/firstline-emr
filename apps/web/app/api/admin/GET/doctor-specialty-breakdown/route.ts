// app/api/admin/GET/doctor-specialty-breakdown/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";

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

    // Get specialty breakdown using PostgreSQL array unnesting
    // This is equivalent to MongoDB's $unwind and $group
    const specialtyBreakdown = await db
      .select({
        specialty: sql<string>`unnest(${users.doctorSpecialty})`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(and(eq(users.accountType, "Doctor"), eq(users.authorized, true)))
      .groupBy(sql`unnest(${users.doctorSpecialty})`)
      .orderBy(sql`count(*) desc`);

    console.log("Raw aggregation result:", specialtyBreakdown);

    // Create a map of all specialties with count 0
    const allSpecialties = Object.values(DoctorSpecialtyList).reduce(
      (acc, specialty) => {
        acc[specialty] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Update counts for specialties that exist in the database
    specialtyBreakdown.forEach(({ specialty, count }) => {
      if (specialty in allSpecialties) {
        allSpecialties[specialty] = count;
      }
    });

    // Convert to array format for the chart
    const chartData = Object.entries(allSpecialties).map(
      ([specialty, count]) => ({
        specialty,
        count,
      }),
    );

    console.log("Final chart data:", chartData);

    return NextResponse.json({ specialtyBreakdown: chartData });
  } catch (error) {
    console.error("Error fetching doctor specialty breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctor specialty breakdown" },
      { status: 500 },
    );
  }
}
