// app/api/admin-signup/send-follow-up/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, userFollowUpEmails } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CryptoJS from "crypto-js";
import { sendNewUserEmail } from "@/utils/emails/new-user-admin-email";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Find the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isAdminCreated || user.accountConfirmed) {
      return NextResponse.json(
        { error: "User not found or already confirmed" },
        { status: 400 },
      );
    }

    // Find the admin user to get proper name information
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 400 },
      );
    }

    // Generate new confirmation token and verification code with 24-hour expiry
    const confirmationToken = CryptoJS.lib.WordArray.random(16).toString(
      CryptoJS.enc.Hex,
    );
    const verificationCode = CryptoJS.lib.WordArray.random(3)
      .toString(CryptoJS.enc.Hex)
      .toUpperCase();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update user with new tokens, expiry
    await db
      .update(users)
      .set({
        confirmationToken,
        confirmationTokenExpiry: tokenExpiry,
        verificationCode,
        verificationCodeExpiry: tokenExpiry,
        tokenSessionExpiry: null, // Reset session expiry
        emailSentDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Track follow-up email in separate table
    await db.insert(userFollowUpEmails).values({
      userId: user.id,
      sentByAdminId: adminUser.id,
      sentByAdminEmail: adminUser.email,
      sentByAdminName: `${adminUser.firstName} ${adminUser.lastName}`,
      sentAt: new Date(),
      emailType: "follow-up",
    });

    // Send email with verification code
    await sendNewUserEmail({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      confirmationToken,
      accountType: user.accountType,
      verificationCode: verificationCode, // Use the newly generated code
      adminSender: {
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Follow-up email sent successfully",
      confirmationToken, // For testing purposes
      followUpEmailSent: {
        sentBy: `${adminUser.firstName} ${adminUser.lastName}`,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Send follow-up email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
