// apps/web/app/api/auth/totp/verify/route.ts
// Verifies a TOTP code during login (after password verification)
import { NextRequest, NextResponse } from "next/server";
import { verifyTotpCode } from "@/lib/totp";
import { db } from "@/db/connection";
import { totpCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, loginToken } = body as {
      email: string;
      code: string;
      loginToken: string;
    };

    if (!email || !code || !loginToken) {
      return NextResponse.json(
        { error: "Email, code, and loginToken are required" },
        { status: 400 },
      );
    }

    // Verify the login token (proves first factor was completed)
    let loginData: any;
    try {
      loginData = jwt.verify(loginToken, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Login session expired. Please sign in again." },
        { status: 401 },
      );
    }

    if (
      loginData.purpose !== "2fa_login" ||
      loginData.email.toLowerCase() !== email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Invalid login session" },
        { status: 401 },
      );
    }

    // Find the user's active, verified TOTP credential
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const credential = await db.query.totpCredentials.findFirst({
      where: and(
        eq(totpCredentials.userId, user.id),
        eq(totpCredentials.isActive, true),
        eq(totpCredentials.isVerified, true),
      ),
    });

    if (!credential) {
      return NextResponse.json(
        { error: "No TOTP authenticator configured" },
        { status: 400 },
      );
    }

    // Verify the TOTP code
    const isValid = verifyTotpCode(
      credential.encryptedSecret,
      credential.encryptionIv,
      credential.encryptionTag,
      code,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 },
      );
    }

    // Update last used timestamp
    await db
      .update(totpCredentials)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(totpCredentials.id, credential.id));

    // Create a short-lived token (same format as passkey auth token)
    // This allows reuse of existing NextAuth authorize() passkey path
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        credentialId: `totp:${credential.id}`,
        authMethod: "totp",
      },
      JWT_SECRET,
      { expiresIn: "5m" },
    );

    return NextResponse.json({ verified: true, token });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify TOTP code" },
      { status: 500 },
    );
  }
}
