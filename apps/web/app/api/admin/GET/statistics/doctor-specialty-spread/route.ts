// app/api/admin/GET/statistics/doctor-specialty-spread/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
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

    // Get all authorized doctors with their specialties
    // Note: doctorSpecialty is stored as a JSON array in PostgreSQL
    const doctors = await db
      .select({
        doctorSpecialty: users.doctorSpecialty,
      })
      .from(users)
      .where(and(eq(users.accountType, "Doctor"), eq(users.authorized, true)));

    console.log("Raw doctors data:", doctors);

    // Create a map of all specialties with count 0
    const allSpecialties = Object.values(DoctorSpecialtyList).reduce(
      (acc, specialty) => {
        acc[specialty] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Count specialties from the doctorSpecialty arrays
    doctors.forEach((doctor) => {
      if (doctor.doctorSpecialty && Array.isArray(doctor.doctorSpecialty)) {
        doctor.doctorSpecialty.forEach((specialty) => {
          if (specialty && specialty in allSpecialties) {
            allSpecialties[specialty]++;
          }
        });
      }
    });

    // Convert to array format for the chart
    const chartData = Object.entries(allSpecialties).map(
      ([specialty, count]) => ({
        specialty,
        count,
      }),
    );

    // Sort by count descending
    chartData.sort((a, b) => b.count - a.count);

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
