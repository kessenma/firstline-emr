// app/api/auth/mobile-login/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db/connection";
import { users, passkeyCredentials, totpCredentials } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { FeatureFlags } from "@/lib/featureFlags";
import { JWT_CONFIG } from "@/lib/jwt-config";

// JWT_SECRET is not base64-encoded
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const { email, password, passkeyToken } = await request.json();

    if (!email || (!password && !passkeyToken)) {
      return NextResponse.json(
        { success: false, error: "Email and password (or passkey) are required" },
        { status: 400 },
      );
    }

    console.log("📱 [Mobile Auth] Login attempt for:", email);

    // Find user by email (case-insensitive)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: {
        admin: true,
        settings: true,
      },
    });

    if (!user) {
      console.log("❌ [Mobile Auth] User not found:", email);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Note: We allow unapproved users to login so they can access the WaitingRoom
    // and set up push notifications. The mobile app will route them appropriately.
    if (!user.authorized) {
      console.log("⏳ [Mobile Auth] User not yet authorized (will show WaitingRoom):", email);
    }

    // Passkey authentication path
    if (passkeyToken) {
      try {
        console.log("🔑 [Mobile Auth] Attempting passkey authentication");
        const decoded = jwt.verify(passkeyToken, JWT_SECRET) as {
          userId: string;
          email: string;
          credentialId: string;
          authMethod: string;
          iat: number;
        };

        // Verify token matches the user
        if (decoded.userId !== user.id || decoded.email.toLowerCase() !== email.toLowerCase()) {
          console.log("❌ [Mobile Auth] Passkey token mismatch");
          return NextResponse.json(
            { success: false, error: "Invalid passkey authentication" },
            { status: 401 },
          );
        }

        // Verify token is not too old (5 minutes max)
        if (Date.now() / 1000 - decoded.iat > 300) {
          console.log("❌ [Mobile Auth] Passkey token expired");
          return NextResponse.json(
            { success: false, error: "Passkey token expired. Please try again." },
            { status: 401 },
          );
        }

        console.log("✅ [Mobile Auth] Passkey authentication successful");
      } catch (tokenError: any) {
        console.log("❌ [Mobile Auth] Passkey token verification failed:", tokenError.message);
        return NextResponse.json(
          { success: false, error: "Invalid passkey authentication" },
          { status: 401 },
        );
      }
    }
    // Password authentication path
    else if (password) {
      if (!user.password) {
        console.log(
          "❌ [Mobile Auth] User has no password (Google user?):",
          email,
        );
        return NextResponse.json(
          {
            success: false,
            error: "Please login with Google or reset your password",
          },
          { status: 401 },
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log("❌ [Mobile Auth] Invalid password for:", email);
        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 },
        );
      }
    }

    // 2FA enforcement for password-based logins
    // Passkey logins already satisfy 2FA (biometric + possession)
    const isPasswordLogin = !!password && !passkeyToken;
    const skipDev = process.env.SKIP_2FA_IN_DEV === "true" || (process.env.NODE_ENV === "development" && process.env.SKIP_2FA_IN_DEV !== "false");

    if (isPasswordLogin && FeatureFlags.REQUIRE_2FA_LOGIN && !skipDev) {
      const [passkeyCount] = await db
        .select({ count: count() })
        .from(passkeyCredentials)
        .where(
          and(
            eq(passkeyCredentials.userId, user.id),
            eq(passkeyCredentials.isActive, true),
          ),
        );
      const [totpCount] = await db
        .select({ count: count() })
        .from(totpCredentials)
        .where(
          and(
            eq(totpCredentials.userId, user.id),
            eq(totpCredentials.isActive, true),
            eq(totpCredentials.isVerified, true),
          ),
        );

      const hasPasskey = (passkeyCount?.count ?? 0) > 0;
      const hasTotp = (totpCount?.count ?? 0) > 0;
      const has2FA = hasPasskey || hasTotp;

      if (has2FA) {
        const methods: string[] = [];
        if (hasTotp) methods.push("totp");
        if (hasPasskey) methods.push("passkey");

        const loginToken = jwt.sign(
          { userId: user.id, email: user.email, purpose: "2fa_login" },
          JWT_SECRET,
          { expiresIn: "5m" },
        );

        console.log("🔐 [Mobile Auth] 2FA required for:", email);
        return NextResponse.json({
          success: false,
          requires2FA: true,
          loginToken,
          methods,
        });
      } else if (FeatureFlags.REQUIRE_2FA_LOGIN) {
        if (!user.twoFactorStatus) {
          const graceDeadline = new Date();
          graceDeadline.setDate(graceDeadline.getDate() + FeatureFlags.TWO_FA_GRACE_PERIOD_DAYS);
          await db
            .update(users)
            .set({
              twoFactorStatus: "setup_pending",
              twoFactorGraceDeadline: graceDeadline,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
        } else if (
          user.twoFactorStatus === "setup_pending" &&
          user.twoFactorGraceDeadline &&
          new Date() > user.twoFactorGraceDeadline
        ) {
          return NextResponse.json({
            success: false,
            requires2FASetup: true,
            error: "Two-factor authentication setup is required to continue.",
          });
        }
      }
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    console.log("✅ [Mobile Auth] Login successful for:", email);

    // Determine account type
    const accountType =
      user.accountType === "Doctor" ||
      user.accountType === "Triage" ||
      user.accountType === "Evac"
        ? user.accountType
        : "Triage";

    // Create long-lived authentication token (30 days)
    // This token is used for API authentication and stays valid for 30 days
    const authToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        accountType,
        isAdmin: !!user.admin,
        firstName: user.firstName,
        lastName: user.lastName,
        doctorSpecialty: user.doctorSpecialty || [],
      },
      JWT_SECRET,
      {
        expiresIn: JWT_CONFIG.AUTH_TOKEN_EXPIRY,
      },
    );

    // Create short-lived PowerSync token (24 hours) - only for authorized users
    // Unapproved users don't need PowerSync access (they're in the WaitingRoom)
    // This token includes all required claims: sub, aud, iss, and custom kid header
    const powerSyncToken = user.authorized
      ? jwt.sign(
          {
            sub: user.id, // PowerSync requires 'sub' claim
            aud: JWT_CONFIG.AUDIENCE, // PowerSync requires 'aud' claim
            user_id: user.id,
            email: user.email,
          },
          JWT_SECRET,
          {
            expiresIn: JWT_CONFIG.POWERSYNC_TOKEN_EXPIRY,
            issuer: JWT_CONFIG.ISSUER, // PowerSync requires 'iss' claim
            header: {
              kid: JWT_CONFIG.KID,
              alg: JWT_CONFIG.ALG,
            },
          },
        )
      : null;

    // Return user data and token
    const responseUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType,
      city: "",
      countries: user.countries || [],
      languages: user.languages || [],
      doctorSpecialty: user.doctorSpecialty || [],
      image: user.image,
      isAdmin: !!user.admin,
      dob: user.dob,
      gender: user.gender,
      userSettingsId: user.settings?.id,
      authorized: !!user.authorized, // Include authorization status for WaitingRoom logic
      approvalDate: user.approvalDate ? user.approvalDate.toISOString() : null,
    };

    return NextResponse.json({
      success: true,
      authToken, // Long-lived token for API authentication (30 days)
      powerSyncToken, // Short-lived token for PowerSync only (24 hours)
      token: authToken, // Backward compatibility - use authToken as main token
      user: responseUser,
    });
  } catch (error) {
    console.error("❌ [Mobile Auth] Error during login:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred during login",
      },
      { status: 500 },
    );
  }
}
