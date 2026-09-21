// app/api/admin-signup/validate-token/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find user with valid confirmation token
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.confirmationToken, token),
          gt(users.confirmationTokenExpiry, new Date()),
          eq(users.isAdminCreated, true),
          eq(users.accountConfirmed, false),
        ),
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if session has expired (user must complete form within time limit after verification)
    if (user.tokenSessionExpiry && new Date() > user.tokenSessionExpiry) {
      return NextResponse.json(
        {
          error:
            "Session expired. Please request a new verification code from your administrator.",
        },
        { status: 401 },
      );
    }

    // Return user data for form pre-population and token expiry information
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountType: user.accountType,
        doctorSpecialty: user.doctorSpecialty || [],
      },
      tokenExpiry: user.tokenSessionExpiry || user.confirmationTokenExpiry,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
