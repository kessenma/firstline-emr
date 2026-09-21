// app/api/mobile-auth/login/route.ts
// Mobile authentication endpoint - separate from NextAuth web sessions

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db/connection";
import { users, userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Languages } from "@/data/languages.enum";
import { Countries } from "@/data/countries.enum";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { JWT_CONFIG } from "@/lib/jwt-config";

export const dynamic = "force-dynamic";

interface LoginRequest {
  email: string;
  password: string;
}

interface MobileUser {
  id: string;
  email: string;
  accountType: "Doctor" | "Triage" | "Evac";
  firstName: string;
  lastName: string;
  city: string;
  countries: Countries[];
  languages: Languages[];
  doctorSpecialty?: DoctorSpecialtyList[];
  image?: string;
  isAdmin: boolean;
  dob?: string | Date;
  gender?: "Male" | "Female";
  token: string;
  userSettingsId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    console.log("📱 Mobile login attempt for:", email);

    // Find user by email (case-insensitive)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: {
        admin: true,
        settings: true,
      },
    });

    if (!user) {
      console.log("❌ Mobile user not found:", email);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!user.authorized) {
      console.log("❌ Mobile user not authorized:", email);
      return NextResponse.json(
        { success: false, error: "Your account has not been approved yet." },
        { status: 403 },
      );
    }

    if (!user.password) {
      console.log("❌ Mobile user has no password (Google user?):", email);
      return NextResponse.json(
        {
          success: false,
          error: "Please login with Google or reset your password.",
        },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("❌ Mobile invalid password for:", email);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Create mobile user object
    const isAdmin = !!user.admin;
    const accountType: "Doctor" | "Triage" | "Evac" =
      user.accountType === "Doctor" ||
      user.accountType === "Triage" ||
      user.accountType === "Evac"
        ? user.accountType
        : "Triage"; // Fallback value

    // Generate JWT token for mobile app
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        isAdmin: isAdmin,
        accountType,
      },
      process.env.NEXTAUTH_SECRET!,
      {
        expiresIn: JWT_CONFIG.AUTH_TOKEN_EXPIRY,
        header: {
          kid: JWT_CONFIG.KID,
          alg: JWT_CONFIG.ALG,
        },
      },
    );

    const mobileUser: MobileUser = {
      id: user.id,
      email: user.email,
      accountType,
      firstName: user.firstName,
      lastName: user.lastName,
      city: "",
      countries: (user.countries || []).filter(
        (c: string): c is Countries =>
          Object.values(Countries).includes(c as Countries),
      ),
      languages: (user.languages || []).filter(
        (l: string): l is Languages =>
          Object.values(Languages).includes(l as Languages),
      ),
      doctorSpecialty: (user.doctorSpecialty || []).filter(
        (s: string): s is DoctorSpecialtyList =>
          Object.values(DoctorSpecialtyList).includes(s as DoctorSpecialtyList),
      ),
      image: user.image || undefined,
      isAdmin,
      dob: user.dob || undefined,
      gender:
        user.gender === "Male" || user.gender === "Female"
          ? user.gender
          : undefined,
      token,
      userSettingsId: user.settings?.id,
    };

    console.log("✅ Mobile login successful for:", email);

    return NextResponse.json({
      success: true,
      user: mobileUser,
    });
  } catch (error) {
    console.error("❌ Mobile login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
