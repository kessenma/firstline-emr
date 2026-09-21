// apps/web/app/api/auth/totp/test/route.ts
// Test-only endpoint: verifies a TOTP code against a user's existing credential
// No login token required — used from the profile "Test Authenticator" feature
import { NextRequest, NextResponse } from "next/server";
import { verifyTotpCode } from "@/lib/totp";
import { db } from "@/db/connection";
import { totpCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = (await request.json()) as {
      email: string;
      code: string;
    };

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 },
      );
    }

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

    const isValid = verifyTotpCode(
      credential.encryptedSecret,
      credential.encryptionIv,
      credential.encryptionTag,
      code,
    );

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error("TOTP test error:", error);
    return NextResponse.json(
      { error: "Failed to test TOTP code" },
      { status: 500 },
    );
  }
}
