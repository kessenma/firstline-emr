// app/api/admin/validate-verification-access/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Find user with valid verification code
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        verificationCode: users.verificationCode,
        verificationCodeExpiry: users.verificationCodeExpiry,
        isAdminCreated: users.isAdminCreated,
        accountConfirmed: users.accountConfirmed,
      })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.isAdminCreated, true),
          eq(users.accountConfirmed, false),
          gt(users.verificationCodeExpiry, new Date()),
        ),
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No pending account found for this email or verification code has expired",
        },
        { status: 404 },
      );
    }

    // User exists and has valid verification code
    return NextResponse.json({
      success: true,
      message: "User eligible for verification",
      hasValidCode: true,
      codeExpiry: user.verificationCodeExpiry,
    });
  } catch (error) {
    console.error("Error validating verification access:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
