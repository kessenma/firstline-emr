// apps/web/app/api/auth/2fa/status/route.ts
// Returns what 2FA methods a user has configured
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/connection";
import { users, passkeyCredentials, totpCredentials } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      // Don't reveal whether email exists - return generic "no 2FA" response
      return NextResponse.json({
        hasPasskey: false,
        hasTotp: false,
        twoFactorStatus: null,
      });
    }

    // Count active passkeys
    const [passkeyCount] = await db
      .select({ count: count() })
      .from(passkeyCredentials)
      .where(
        and(
          eq(passkeyCredentials.userId, user.id),
          eq(passkeyCredentials.isActive, true),
        ),
      );

    // Count active, verified TOTP credentials
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

    return NextResponse.json({
      hasPasskey: (passkeyCount?.count ?? 0) > 0,
      hasTotp: (totpCount?.count ?? 0) > 0,
      twoFactorStatus: user.twoFactorStatus || null,
      graceDeadline: user.twoFactorGraceDeadline?.toISOString() || null,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 },
    );
  }
}
