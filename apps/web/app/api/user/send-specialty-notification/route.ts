// apps/web/app/api/user/send-specialty-notification/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db/connection";
import { userSettings, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const {
      specialty,
      patientId,
      patientName,
      patientCountry,
      patientLanguage,
      subject,
      message,
    } = await request.json();

    // Validate required fields
    if (!specialty) {
      return NextResponse.json(
        { error: "Specialty is required" },
        { status: 400 },
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Specialty lives on `users`; resolve the matching doctors there, then pull
    // their notification preferences from `user_settings`.
    const specialtyMatches = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        countries: users.countries,
      })
      .from(users)
      .where(
        and(
          eq(users.accountType, "Doctor"),
          sql`${users.doctorSpecialty} @> ARRAY[${specialty}]::text[]`,
        ),
      );
    const matchedUsers = new Map(specialtyMatches.map((u) => [u.id, u]));

    // `user_settings` is preferences-only, so it is joined for notification
    // prefs while identity comes from `users`.
    const doctorSettings = await db
      .select()
      .from(userSettings)
      .innerJoin(users, eq(users.id, userSettings.userId))
      .where(eq(users.accountType, "Doctor"))
      .then((rows) => rows.map((r) => r.user_settings));

    if (!doctorSettings || doctorSettings.length === 0) {
      return NextResponse.json(
        {
          error: "No doctors found with the specified specialty and country",
          totalCount: 0,
          emailCount: 0,
        },
        { status: 404 },
      );
    }

    // Identity and countries come from `users`; notification preferences come
    // from the joined `user_settings` row.
    const mappedSettings = doctorSettings
      .filter((setting) => {
        const matched = matchedUsers.get(setting.userId);
        if (!matched) return false;
        return patientCountry
          ? Array.isArray(matched.countries) &&
              matched.countries.includes(patientCountry)
          : true;
      })
      .map((setting) => {
        const matched = matchedUsers.get(setting.userId);
        if (!matched?.email) return null;

        return {
          userId: setting.userId,
          email: matched.email,
          name:
            [matched.firstName, matched.lastName].filter(Boolean).join(" ") ||
            "Doctor",
          pushNotificationsEnabled:
            setting.pushNotificationsEnabled ?? false,
        };
      })
      .filter(Boolean); // Remove null entries

    if (mappedSettings.length === 0) {
      return NextResponse.json(
        {
          error: "No active doctors found with the specified specialty",
          totalCount: 0,
          emailCount: 0,
        },
        { status: 404 },
      );
    }

    // Count how many will receive push notifications
    const emailCount = mappedSettings.filter(
      (user) => user !== null && user.pushNotificationsEnabled,
    ).length;

    console.log(
      `Sending notifications to ${mappedSettings.length} doctors (${emailCount} with email) for specialty: ${specialty}`,
    );

    // Forward the request to the notifications API
    const notificationResponse = await axios.post(
      `${request.nextUrl.origin}/api/notifications`,
      {
        specialty,
        patientId,
        patientName,
        patientCountry,
        patientLanguage,
        subject,
        message,
        userSettings: mappedSettings,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
      },
    );

    return NextResponse.json(notificationResponse.data);
  } catch (error) {
    console.error("Error sending specialty notification:", error);
    return NextResponse.json(
      {
        error: "Failed to send specialty notification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
