// app/api/admin/POST/create-user/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { ensureUserModels } from "@/utils/user-model-utils";
import CryptoJS from "crypto-js";

interface CreateUserRequest {
  accountType: "Doctor" | "Triage" | "Evac";
  email: string;
  firstName: string;
  lastName: string;
  dob?: string;
  doctorSpecialty?: string[];
  languages?: string[];
  gender: "Male" | "Female";
  countries?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Parse request body
    const {
      accountType,
      email,
      firstName,
      lastName,
      dob,
      doctorSpecialty,
      languages,
      gender,
      countries,
    }: CreateUserRequest = await request.json();

    // Validate required fields
    if (!accountType || !email || !firstName || !lastName || !gender) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: accountType, email, firstName, lastName, gender",
        },
        { status: 400 },
      );
    }

    // Validate account type specific fields
    if (
      accountType === "Doctor" &&
      (!doctorSpecialty || doctorSpecialty.length === 0)
    ) {
      return NextResponse.json(
        { message: "Doctor specialty is required for Doctor accounts" },
        { status: 400 },
      );
    }

    if (accountType === "Triage" && (!languages || languages.length === 0)) {
      return NextResponse.json(
        { message: "Languages are required for Triage accounts" },
        { status: 400 },
      );
    }

    if (accountType === "Evac" && (!countries || countries.length === 0)) {
      return NextResponse.json(
        { message: "Countries are required for Evacuation accounts" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 },
      );
    }

    // Generate verification code for account setup
    const verificationCode = CryptoJS.lib.WordArray.random(3)
      .toString(CryptoJS.enc.Hex)
      .toUpperCase();
    const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get admin user ID for tracking
    const adminUserId = session.userId as string;
    const adminEmail = session.email as string;
    const adminName =
      `${session.firstName || ""} ${session.lastName || ""}`.trim();

    // Create user data object
    const userData: any = {
      firstName,
      lastName,
      email,
      accountType,
      gender,
      authorized: true, // Admin-created users are pre-authorized
      approvalDate: new Date(),
      verificationCode,
      verificationCodeExpiry,
      isAdminCreated: true, // Mark as admin-created for tracking
      accountConfirmed: false, // User needs to confirm account during signup
      // HIPAA compliance tracking
      adminCreatedBy: {
        adminId: adminUserId,
        adminEmail: adminEmail,
        adminName: adminName,
        createdAt: new Date(),
      },
      adminCreatedDate: new Date(),
    };

    // Add dob if provided
    if (dob) {
      userData.dob = new Date(dob);
    }

    // Add account-specific fields
    if (accountType === "Doctor" && doctorSpecialty) {
      userData.doctorSpecialty = doctorSpecialty;
    }
    if (languages) {
      userData.languages = languages;
    }
    if (countries) {
      userData.countries = countries;
    }

    // Create the user
    const [newUser] = await db.insert(users).values(userData).returning();

    // Every other creation path (signup) also creates the user_settings and
    // user_messages rows. Without them the session hydrates `countries` and
    // `languages` as empty, because auth.ts reads those from user_settings.
    // Non-fatal: the user row is already committed, and ensureUserModels is
    // idempotent, so a failure here self-heals on account confirmation.
    let settingsWarning: string | undefined;
    try {
      await ensureUserModels(newUser.id);
    } catch (settingsError) {
      settingsWarning =
        "User created, but their settings row could not be initialised.";
      console.error(
        `Failed to create user models for admin-created user ${newUser.id}:`,
        settingsError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        userId: newUser.id,
        verificationCode, // Return code for email sending
        ...(settingsWarning ? { warning: settingsWarning } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user:", error);

    if (error instanceof Error) {
      // Handle specific database errors
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { message: `Error creating user: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
