// apps/web/app/api/doctors/available-specialties/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Query all authorized doctors with their specialties
    const doctors = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        doctorSpecialty: users.doctorSpecialty,
      })
      .from(users)
      .where(
        and(
          eq(users.accountType, "Doctor"),
          eq(users.authorized, true),
          isNotNull(users.doctorSpecialty)
        )
      );

    // Extract all unique specialties from doctors
    const availableSpecialties = new Set<string>();

    doctors.forEach((doctor) => {
      if (doctor.doctorSpecialty && Array.isArray(doctor.doctorSpecialty)) {
        doctor.doctorSpecialty.forEach((specialty) => {
          if (specialty) {
            availableSpecialties.add(specialty);
          }
        });
      }
    });

    return NextResponse.json({
      availableSpecialties: Array.from(availableSpecialties).sort(),
      doctorCount: doctors.length,
    });
  } catch (error) {
    console.error("Error fetching available specialties:", error);
    return NextResponse.json(
      { error: "Failed to fetch available specialties" },
      { status: 500 }
    );
  }
}

// Endpoint to check if a specific specialty has doctors
export async function POST(request: Request) {
  try {
    const { specialty } = await request.json();

    if (!specialty) {
      return NextResponse.json(
        { error: "Specialty is required" },
        { status: 400 }
      );
    }

    // Query doctors with the specific specialty
    const doctorsWithSpecialty = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.accountType, "Doctor"),
          eq(users.authorized, true),
          isNotNull(users.doctorSpecialty),
          sql`${users.doctorSpecialty} @> ARRAY[${specialty}]::text[]`
        )
      );

    const hasDoctors = doctorsWithSpecialty.length > 0;

    return NextResponse.json({
      specialty,
      hasDoctors,
      doctorCount: doctorsWithSpecialty.length,
      doctors: hasDoctors
        ? doctorsWithSpecialty.map((d) => ({
            id: d.id,
            name: `${d.firstName} ${d.lastName}`,
          }))
        : [],
    });
  } catch (error) {
    console.error("Error checking specialty availability:", error);
    return NextResponse.json(
      { error: "Failed to check specialty availability" },
      { status: 500 }
    );
  }
}
