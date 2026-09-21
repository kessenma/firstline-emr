// apps/web/app/api/user-settings/get-by-specialty/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Support both web sessions and mobile JWT tokens
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { specialty, patientCountry } = await req.json();

    if (!specialty) {
      return NextResponse.json(
        { error: "Specialty is required" },
        { status: 400 },
      );
    }

    console.log(`Finding user settings for specialty: ${specialty}`);

    // Specialty and countries are read from `users` — the single source of
    // truth. Reading them from `user_settings` used to skip admin-created
    // users entirely, since that path never creates a settings row.
    const userSettingsData = await db
      .select({
        userId: users.id,
        name: sql<string>`concat_ws(' ', ${users.firstName}, ${users.lastName})`,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.accountType, "Doctor"),
          sql`${users.doctorSpecialty} @> ARRAY[${specialty}]::text[]`,
          patientCountry
            ? sql`${users.countries} @> ARRAY[${patientCountry}]::text[]`
            : sql`true`, // If no country specified, don't filter by country
        ),
      );

    console.log(
      `Found ${userSettingsData.length} user settings for specialty: ${specialty}`,
    );

    // Ensure each user only appears once in the results (though they should already be unique)
    const uniqueUserSettings = [];
    const seenUserIds = new Set();

    for (const setting of userSettingsData) {
      const userId = setting.userId;
      if (!seenUserIds.has(userId)) {
        seenUserIds.add(userId);
        uniqueUserSettings.push(setting);
      }
    }

    console.log(`Returning ${uniqueUserSettings.length} unique user settings`);

    return NextResponse.json({
      userSettings: uniqueUserSettings,
      totalCount: uniqueUserSettings.length,
    });
  } catch (error) {
    console.error("Error fetching user settings by specialty:", error);
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 },
    );
  }
}
