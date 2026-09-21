// apps/web/app/api/user/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/mobileAuth";
import { db } from "@/db/connection";
import { users, userProfileLogs, userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { Languages } from "@/data/languages.enum";
import { storageService } from "@/lib/storage";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  gender?: "Male" | "Female";
  dob?: string;
  countries?: string[];
  languages?: string[];
  doctorSpecialty?: DoctorSpecialtyList[];
  accountType?: "Doctor" | "Triage" | "Evac";
  removeSpecialty?: string;
  userLanguage?: string;
  googleId?: string;
  googleEmail?: string;
  googleImage?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.pathname.split("/").pop();

  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOwnProfile = session.userId === userId;
  const isAdmin = session.isAdmin === true;

  if (!isOwnProfile && !isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized access to another user's profile" },
      { status: 403 },
    );
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId as string),
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password, ...safeUser } = existingUser as any;

    // Sign image URL if it's a storage path
    if (
      safeUser.image &&
      !safeUser.image.startsWith("http") &&
      !safeUser.image.startsWith("https")
    ) {
      try {
        safeUser.image = await storageService.getSignedUrl(
          safeUser.image,
          86400,
        ); // 24 hours
      } catch (e) {
        console.error("Failed to sign image url", e);
      }
    }

    return NextResponse.json({ ...safeUser });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: `Error Getting User ${error}` },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.pathname.split("/").pop();

  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  console.log("🔍 [PATCH /api/user/[id]] Debug Info:");
  console.log("  - userId from URL:", userId);
  console.log("  - session.userId:", session?.userId);
  console.log("  - session.email:", session?.email);
  console.log("  - session.isAdmin:", session?.isAdmin);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOwnProfile = session.userId === userId;
  const isAdmin = session.isAdmin === true;

  console.log("  - isOwnProfile:", isOwnProfile);
  console.log("  - isAdmin:", isAdmin);
  console.log("  - IDs match:", session.userId === userId);
  console.log("  - userId type:", typeof userId);
  console.log("  - session.userId type:", typeof session.userId);

  if (!isOwnProfile && !isAdmin) {
    console.log(
      "❌ [PATCH /api/user/[id]] Authorization failed: not own profile and not admin",
    );
    return NextResponse.json(
      { error: "Unauthorized access to modify another user's profile" },
      { status: 403 },
    );
  }

  const {
    firstName,
    lastName,
    gender,
    dob,
    countries,
    languages,
    doctorSpecialty,
    accountType,
    removeSpecialty,
    userLanguage,
    googleId,
    googleEmail,
    googleImage,
  }: UpdateUserData = await request.json();

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId as string),
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    const newValues: Partial<typeof users.$inferInsert> = {};

    if (firstName !== undefined && firstName !== existingUser.firstName) {
      changes.push({
        field: "firstName",
        oldValue: existingUser.firstName,
        newValue: firstName,
      });
      newValues.firstName = firstName;
    }
    if (lastName !== undefined && lastName !== existingUser.lastName) {
      changes.push({
        field: "lastName",
        oldValue: existingUser.lastName,
        newValue: lastName,
      });
      newValues.lastName = lastName;
    }
    if (gender !== undefined && gender !== existingUser.gender) {
      changes.push({
        field: "gender",
        oldValue: existingUser.gender,
        newValue: gender,
      });
      newValues.gender = gender;
    }
    if (dob !== undefined) {
      const newDate = dob ? new Date(dob) : null;
      const oldDate = existingUser.dob;
      if (newDate?.toISOString() !== oldDate?.toISOString()) {
        changes.push({ field: "dob", oldValue: oldDate, newValue: newDate });
        newValues.dob = newDate as any;
      }
    }
    if (countries !== undefined) {
      const oldCountries = existingUser.countries || [];
      if (JSON.stringify(countries) !== JSON.stringify(oldCountries)) {
        changes.push({
          field: "countries",
          oldValue: oldCountries,
          newValue: countries,
        });
        newValues.countries = countries as any;
      }
    }
    if (languages !== undefined) {
      const filteredLanguages = languages.filter((lang) =>
        Object.values(Languages).includes(lang as Languages),
      );
      const oldLanguages = existingUser.languages || [];
      if (JSON.stringify(filteredLanguages) !== JSON.stringify(oldLanguages)) {
        changes.push({
          field: "languages",
          oldValue: oldLanguages,
          newValue: filteredLanguages,
        });
        newValues.languages = filteredLanguages as any;
      }
    }
    if (
      userLanguage &&
      Object.values(Languages).includes(userLanguage as Languages)
    ) {
      const existing = new Set(existingUser.languages || []);
      if (!existing.has(userLanguage)) {
        const updated = [...existing, userLanguage];
        changes.push({
          field: "languages",
          oldValue: existingUser.languages,
          newValue: updated,
        });
        newValues.languages = updated as any;
      }
    }
    if (doctorSpecialty !== undefined) {
      const filteredSpecialties = doctorSpecialty.filter((s) =>
        Object.values(DoctorSpecialtyList).includes(s),
      );
      const oldSpecialties = existingUser.doctorSpecialty || [];
      if (
        JSON.stringify(filteredSpecialties) !== JSON.stringify(oldSpecialties)
      ) {
        changes.push({
          field: "doctorSpecialty",
          oldValue: oldSpecialties,
          newValue: filteredSpecialties,
        });
        newValues.doctorSpecialty = filteredSpecialties as any;
      }
    }
    if (removeSpecialty) {
      const oldSpecialties = existingUser.doctorSpecialty || [];
      const newSpecialties = oldSpecialties.filter(
        (s) => s !== removeSpecialty,
      );
      if (JSON.stringify(newSpecialties) !== JSON.stringify(oldSpecialties)) {
        changes.push({
          field: "doctorSpecialty",
          oldValue: oldSpecialties,
          newValue: newSpecialties,
        });
        newValues.doctorSpecialty = newSpecialties as any;
      }
    }
    if (accountType !== undefined && accountType !== existingUser.accountType) {
      changes.push({
        field: "accountType",
        oldValue: existingUser.accountType,
        newValue: accountType,
      });
      newValues.accountType = accountType as any;
    }

    if (changes.length > 0) {
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ ...newValues, updatedAt: new Date() })
          .where(eq(users.id, userId as string));

        await tx.insert(userProfileLogs).values({
          userId: userId as string,
          changedBy: session.userId, // Use the authenticated user's ID
          changes,
          isAdminAction: isAdmin && !isOwnProfile,
        });

        // No settings mirror to maintain: accountType, countries and languages
        // are written to `users` above, which now owns them outright.
      });
    }

    const updated = await db.query.users.findFirst({
      where: eq(users.id, userId as string),
    });
    const responseData = {
      id: updated?.id,
      firstName: updated?.firstName,
      lastName: updated?.lastName,
      gender: updated?.gender,
      dob: updated?.dob,
      countries: updated?.countries,
      languages: updated?.languages,
      doctorSpecialty: updated?.doctorSpecialty,
      accountType: updated?.accountType,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: `Error Updating User: ${error}` },
      { status: 500 },
    );
  }
}
