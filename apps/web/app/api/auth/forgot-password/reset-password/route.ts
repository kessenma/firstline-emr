// app/api/auth/forgot-password/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, resetPasswordWithCode } from "@/lib/auth-db-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { message: "Email and new password are required" },
        { status: 400 },
      );
    }

    // Find the user
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if verification code exists
    if (!user.tempPasswordResetCode) {
      return NextResponse.json(
        { message: "Invalid request or verification not completed" },
        { status: 400 },
      );
    }

    // Check if code is expired
    if (!user.tempCodeExpiry || new Date() > user.tempCodeExpiry) {
      return NextResponse.json(
        { message: "Verification code expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear temp code
    const success = await resetPasswordWithCode(email, hashedPassword);

    if (!success) {
      return NextResponse.json(
        { message: "Failed to reset password" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 },
    );
  }
}
