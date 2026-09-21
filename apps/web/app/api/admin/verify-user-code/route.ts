// app/api/admin/verify-user-code/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email, verificationCode } = await request.json();

  if (!email || !verificationCode) {
    return NextResponse.json(
      {
        success: false,
        error: "Email and verification code are required",
      },
      { status: 400 },
    );
  }

  try {
    // Find the user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Check if the account has already been confirmed (token already used)
    if (user.accountConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This verification link has already been used. Please request a new signup email from your administrator.",
        },
        { status: 401 },
      );
    }

    // Check if the code has expired
    if (
      !user.verificationCodeExpiry ||
      Date.now() > user.verificationCodeExpiry.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code expired. Please request a new signup email from your administrator.",
        },
        { status: 401 },
      );
    }

    // Check if the code matches
    if (user.verificationCode !== verificationCode) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 401 },
      );
    }

    // Set session expiry (30 minutes to complete the form after verification)
    const sessionExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Clear the verification code and set session expiry
    await db
      .update(users)
      .set({
        verificationCode: null,
        verificationCodeExpiry: null,
        tokenSessionExpiry: sessionExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      {
        success: true,
        confirmationToken: user.confirmationToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error verifying user code:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
