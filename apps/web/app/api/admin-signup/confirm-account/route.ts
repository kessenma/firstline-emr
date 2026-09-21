// app/api/admin-signup/confirm-account/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, securityQuestions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { ensureUserModels } from "@/utils/user-model-utils";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password, userData } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Prepare update data
    const updateData: any = {
      password: hashedPassword,
      accountConfirmed: true,
      confirmationToken: null,
      confirmationTokenExpiry: null,
      tokenSessionExpiry: null, // Clear session expiry after successful confirmation
      updatedAt: new Date(),
    };

    // Update user data if provided
    if (userData) {
      if (userData.firstName) updateData.firstName = userData.firstName;
      if (userData.lastName) updateData.lastName = userData.lastName;
      if (userData.email) updateData.email = userData.email;
      if (userData.doctorSpecialty)
        updateData.doctorSpecialty = userData.doctorSpecialty;
      if (userData.dob) updateData.dob = new Date(userData.dob);
      if (userData.gender) updateData.gender = userData.gender;
    }

    // Update user
    await db.update(users).set(updateData).where(eq(users.id, user.id));

    // Backstop for users created before admin create-user initialised these.
    // Idempotent — creates the settings/messages rows only if missing.
    try {
      await ensureUserModels(user.id);
    } catch (settingsError) {
      console.error(
        `Failed to ensure user models for confirmed user ${user.id}:`,
        settingsError,
      );
    }

    // Update security questions if provided
    if (
      userData &&
      userData.question1 &&
      userData.answer1 &&
      userData.question2 &&
      userData.answer2 &&
      userData.question3 &&
      userData.answer3
    ) {
      // Delete existing security questions
      await db
        .delete(securityQuestions)
        .where(eq(securityQuestions.userId, user.id));

      // Insert new security questions
      await db.insert(securityQuestions).values([
        {
          userId: user.id,
          question: userData.question1,
          answer: userData.answer1,
        },
        {
          userId: user.id,
          question: userData.question2,
          answer: userData.answer2,
        },
        {
          userId: user.id,
          question: userData.question3,
          answer: userData.answer3,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Account confirmed successfully",
    });
  } catch (error) {
    console.error("Account confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
