// apps/web/app/api/auth/mobile-login/verify-2fa/route.ts
// Completes mobile login after 2FA verification (TOTP code or passkey token)
import { NextRequest, NextResponse } from "next/server";
import { verifyTotpCode } from "@/lib/totp";
import { db } from "@/db/connection";
import { users, totpCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "@/lib/jwt-config";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginToken, totpCode, passkeyToken } = body as {
      loginToken: string;
      totpCode?: string;
      passkeyToken?: string;
    };

    if (!loginToken) {
      return NextResponse.json(
        { success: false, error: "Login token is required" },
        { status: 400 },
      );
    }

    if (!totpCode && !passkeyToken) {
      return NextResponse.json(
        { success: false, error: "TOTP code or passkey token is required" },
        { status: 400 },
      );
    }

    // Verify login token
    let loginData: any;
    try {
      loginData = jwt.verify(loginToken, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, error: "Login session expired. Please sign in again." },
        { status: 401 },
      );
    }

    if (loginData.purpose !== "2fa_login") {
      return NextResponse.json(
        { success: false, error: "Invalid login session" },
        { status: 401 },
      );
    }

    // Load user
    const user = await db.query.users.findFirst({
      where: eq(users.id, loginData.userId),
      with: { admin: true, settings: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Verify 2FA factor
    if (totpCode) {
      const credential = await db.query.totpCredentials.findFirst({
        where: and(
          eq(totpCredentials.userId, user.id),
          eq(totpCredentials.isActive, true),
          eq(totpCredentials.isVerified, true),
        ),
      });

      if (!credential) {
        return NextResponse.json(
          { success: false, error: "No TOTP authenticator configured" },
          { status: 400 },
        );
      }

      const isValid = verifyTotpCode(
        credential.encryptedSecret,
        credential.encryptionIv,
        credential.encryptionTag,
        totpCode,
      );

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid code. Please try again." },
          { status: 400 },
        );
      }

      // Update last used
      await db
        .update(totpCredentials)
        .set({ lastUsedAt: new Date(), updatedAt: new Date() })
        .where(eq(totpCredentials.id, credential.id));
    } else if (passkeyToken) {
      // Verify passkey token (same logic as mobile-login passkey path)
      try {
        const decoded = jwt.verify(passkeyToken, JWT_SECRET) as {
          userId: string;
          email: string;
          iat: number;
        };

        if (decoded.userId !== user.id) {
          return NextResponse.json(
            { success: false, error: "Passkey token mismatch" },
            { status: 401 },
          );
        }

        if (Date.now() / 1000 - decoded.iat > 300) {
          return NextResponse.json(
            { success: false, error: "Passkey token expired" },
            { status: 401 },
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid passkey token" },
          { status: 401 },
        );
      }
    }

    // 2FA verified — issue tokens (same as mobile-login success path)
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const accountType =
      user.accountType === "Doctor" ||
      user.accountType === "Triage" ||
      user.accountType === "Evac"
        ? user.accountType
        : "Triage";

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
      { expiresIn: JWT_CONFIG.AUTH_TOKEN_EXPIRY },
    );

    const powerSyncToken = user.authorized
      ? jwt.sign(
          {
            sub: user.id,
            aud: JWT_CONFIG.AUDIENCE,
            user_id: user.id,
            email: user.email,
          },
          JWT_SECRET,
          {
            expiresIn: JWT_CONFIG.POWERSYNC_TOKEN_EXPIRY,
            issuer: JWT_CONFIG.ISSUER,
            header: { kid: JWT_CONFIG.KID, alg: JWT_CONFIG.ALG },
          },
        )
      : null;

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
      authorized: !!user.authorized,
      approvalDate: user.approvalDate ? user.approvalDate.toISOString() : null,
    };

    return NextResponse.json({
      success: true,
      authToken,
      powerSyncToken,
      token: authToken,
      user: responseUser,
    });
  } catch (error) {
    console.error("❌ [Mobile Auth] 2FA verify error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred during 2FA verification",
      },
      { status: 500 },
    );
  }
}
