// apps/web/app/api/auth/verify/totp/route.ts
// TOTP check for the Verify-Auth tool. Proves TOTP_ENCRYPTION_KEY on this server
// matches the one the secret was encrypted with (a decrypt failure => key
// mismatch, distinct from a wrong code). Creates NO session/token and does not
// mutate the credential — it only reports whether 2FA survived the migration.
import { NextRequest, NextResponse } from "next/server";
import { verifyTotpCode } from "@/lib/totp";
import { db } from "@/db/connection";
import { totpCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = (await request.json()) as {
      email?: string;
      code?: string;
    };

    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: "Email and code are required" },
        { status: 400 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "No account found with this email" },
        { status: 404 },
      );
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
        { ok: false, error: "This account has no active 2FA (TOTP) configured." },
        { status: 400 },
      );
    }

    let isValid: boolean;
    try {
      isValid = verifyTotpCode(
        credential.encryptedSecret,
        credential.encryptionIv,
        credential.encryptionTag,
        code,
      );
    } catch {
      // decryptSecret throws when TOTP_ENCRYPTION_KEY is wrong/missing.
      return NextResponse.json({
        ok: false,
        keyMismatch: true,
        error:
          "The stored 2FA secret could not be decrypted — TOTP_ENCRYPTION_KEY does not match this server.",
      });
    }

    if (!isValid) {
      return NextResponse.json({
        ok: false,
        error: "Code did not validate. The secret decrypted, but the code is wrong or expired.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("TOTP verify-test error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to verify TOTP code" },
      { status: 500 },
    );
  }
}
