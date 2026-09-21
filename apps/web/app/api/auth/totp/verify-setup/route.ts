// apps/web/app/api/auth/totp/verify-setup/route.ts
// Verifies a TOTP code during initial setup (signup or profile)
import { NextRequest, NextResponse } from "next/server";
import { verifyTotpCodeWithRawSecret, verifyTotpCode } from "@/lib/totp";
import { db } from "@/db/connection";
import { totpCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, setupToken, userId } = body as {
      code: string;
      setupToken?: string;
      userId?: string;
    };

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "A 6-digit code is required" },
        { status: 400 },
      );
    }

    // Signup flow: verify using setupToken
    if (setupToken) {
      let decoded: any;
      try {
        decoded = jwt.verify(setupToken, JWT_SECRET);
      } catch {
        return NextResponse.json(
          { error: "Setup token expired. Please start TOTP setup again." },
          { status: 400 },
        );
      }

      if (decoded.purpose !== "totp_setup") {
        return NextResponse.json(
          { error: "Invalid setup token" },
          { status: 400 },
        );
      }

      // Verify the code against the raw secret from the token
      const isValid = verifyTotpCodeWithRawSecret(decoded.rawSecret, code);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid code. Please try again." },
          { status: 400 },
        );
      }

      // If user already exists (profile setup flow), persist to DB immediately
      if (decoded.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, decoded.email),
        });

        if (existingUser) {
          // Deactivate any existing TOTP credentials for this user
          await db
            .update(totpCredentials)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(totpCredentials.userId, existingUser.id));

          // Insert new verified credential
          await db.insert(totpCredentials).values({
            userId: existingUser.id,
            encryptedSecret: decoded.encryptedSecret,
            encryptionIv: decoded.encryptionIv,
            encryptionTag: decoded.encryptionTag,
            isActive: true,
            isVerified: true,
          });

          return NextResponse.json({ verified: true });
        }
      }

      // Signup flow: user doesn't exist yet, return data for caching until account creation
      return NextResponse.json({
        verified: true,
        totpCredentialData: {
          encryptedSecret: decoded.encryptedSecret,
          encryptionIv: decoded.encryptionIv,
          encryptionTag: decoded.encryptionTag,
        },
      });
    }

    // Authenticated user flow: verify and store in DB
    if (userId) {
      // Find the user's pending (unverified) TOTP credential
      const pending = await db.query.totpCredentials.findFirst({
        where: and(
          eq(totpCredentials.userId, userId),
          eq(totpCredentials.isActive, true),
          eq(totpCredentials.isVerified, false),
        ),
      });

      if (!pending) {
        return NextResponse.json(
          { error: "No pending TOTP setup found. Please start setup again." },
          { status: 400 },
        );
      }

      const isValid = verifyTotpCode(
        pending.encryptedSecret,
        pending.encryptionIv,
        pending.encryptionTag,
        code,
      );

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid code. Please try again." },
          { status: 400 },
        );
      }

      // Mark as verified
      await db
        .update(totpCredentials)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(totpCredentials.id, pending.id));

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json(
      { error: "Either setupToken or userId is required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("TOTP verify-setup error:", error);
    return NextResponse.json(
      { error: "Failed to verify TOTP code" },
      { status: 500 },
    );
  }
}
