// apps/web/app/api/auth/webauthn/authenticate/options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { db } from "@/db/connection";
import { users, passkeyCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

// WebAuthn Relying Party configuration
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const cookieStore = await cookies();

    // If email provided, use targeted authentication (specific user's passkeys)
    // If no email, use discoverable credentials mode (browser shows all passkeys for this site)
    if (email) {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account found with this email" },
          { status: 404 }
        );
      }

      // Get user's active passkey credentials
      const credentials = await db.query.passkeyCredentials.findMany({
        where: and(
          eq(passkeyCredentials.userId, user.id),
          eq(passkeyCredentials.isActive, true)
        ),
      });

      if (credentials.length === 0) {
        return NextResponse.json(
          { error: "No passkeys registered for this account. Please use password login." },
          { status: 404 }
        );
      }

      // Generate authentication options for specific user
      const options = await generateAuthenticationOptions({
        rpID,
        // Allow credentials from this user
        allowCredentials: credentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as AuthenticatorTransport[] | undefined,
        })),
        userVerification: "required",
      });

      // Store challenge and user ID
      cookieStore.set("webauthn_auth_challenge", options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });

      cookieStore.set("webauthn_auth_user_id", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });

      // Create a signed challenge token for mobile clients (cookies don't work cross-origin)
      const challengeToken = jwt.sign(
        {
          challenge: options.challenge,
          userId: user.id,
          mode: "targeted",
        },
        JWT_SECRET,
        { expiresIn: "5m" }
      );

      return NextResponse.json({ ...options, challengeToken });
    } else {
      // Discoverable credentials mode - no email required
      // Browser will show all passkeys registered for this site
      const options = await generateAuthenticationOptions({
        rpID,
        // Empty allowCredentials enables discoverable credentials
        allowCredentials: [],
        userVerification: "required",
      });

      // Store challenge (no user ID yet - will be determined from credential)
      cookieStore.set("webauthn_auth_challenge", options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });

      // Clear any existing user ID cookie for discoverable mode
      cookieStore.delete("webauthn_auth_user_id");

      // Mark this as discoverable mode
      cookieStore.set("webauthn_auth_mode", "discoverable", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 300,
        path: "/",
      });

      // Create a signed challenge token for mobile clients (cookies don't work cross-origin)
      const challengeToken = jwt.sign(
        {
          challenge: options.challenge,
          mode: "discoverable",
        },
        JWT_SECRET,
        { expiresIn: "5m" }
      );

      return NextResponse.json({ ...options, challengeToken });
    }
  } catch (error) {
    console.error("WebAuthn authentication options error:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
