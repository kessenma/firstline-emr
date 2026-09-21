// apps/web/app/api/auth/webauthn/authenticate/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { cookies } from "next/headers";
import { db } from "@/db/connection";
import { passkeyCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

// Use the same JWT_SECRET as mobile-login to ensure passkey tokens can be verified
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

// WebAuthn Relying Party configuration
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const webOrigin = process.env.WEBAUTHN_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000";
// Mobile origins: Android uses android:apk-key-hash format, iOS uses https domain with associated domains
const androidOrigin = process.env.WEBAUTHN_ANDROID_ORIGIN; // e.g., "android:apk-key-hash:..."

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, email, challengeToken } = body as {
      credential: AuthenticationResponseJSON;
      email?: string; // Email is now optional for discoverable credentials
      challengeToken?: string; // For mobile clients that can't use cookies
    };

    if (!credential) {
      return NextResponse.json(
        { error: "Credential is required" },
        { status: 400 }
      );
    }

    // Get stored challenge, user ID, and mode - try cookies first, then fallback to challengeToken
    const cookieStore = await cookies();
    let storedChallenge = cookieStore.get("webauthn_auth_challenge")?.value;
    let storedUserId = cookieStore.get("webauthn_auth_user_id")?.value;
    let authMode = cookieStore.get("webauthn_auth_mode")?.value;

    // If no cookie challenge, try to extract from challengeToken (for mobile)
    if (!storedChallenge && challengeToken) {
      try {
        const decoded = jwt.verify(challengeToken, JWT_SECRET) as {
          challenge: string;
          userId?: string;
          mode: string;
        };
        storedChallenge = decoded.challenge;
        storedUserId = decoded.userId;
        authMode = decoded.mode === "discoverable" ? "discoverable" : undefined;
      } catch (tokenError) {
        console.error("Invalid challenge token:", tokenError);
        return NextResponse.json(
          { error: "Invalid or expired challenge token. Please try again." },
          { status: 400 }
        );
      }
    }

    if (!storedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or not found. Please try again." },
        { status: 400 }
      );
    }

    let credentialRecord;
    let userId: string;

    if (authMode === "discoverable" || !storedUserId) {
      // Discoverable credentials mode - look up user from credential ID
      credentialRecord = await db.query.passkeyCredentials.findFirst({
        where: and(
          eq(passkeyCredentials.credentialId, credential.id),
          eq(passkeyCredentials.isActive, true)
        ),
      });

      if (!credentialRecord) {
        return NextResponse.json(
          { error: "Passkey not found or inactive" },
          { status: 404 }
        );
      }

      userId = credentialRecord.userId;
    } else {
      // Email-based mode - use stored user ID
      userId = storedUserId;

      // Find the credential in database for this specific user
      credentialRecord = await db.query.passkeyCredentials.findFirst({
        where: and(
          eq(passkeyCredentials.credentialId, credential.id),
          eq(passkeyCredentials.userId, storedUserId),
          eq(passkeyCredentials.isActive, true)
        ),
      });

      if (!credentialRecord) {
        return NextResponse.json(
          { error: "Passkey not found or inactive" },
          { status: 404 }
        );
      }
    }

    // Verify the authentication response
    // Support multiple origins: web origin + optional Android/iOS origins
    const expectedOrigins: string[] = [webOrigin];
    if (androidOrigin) {
      expectedOrigins.push(androidOrigin);
    }
    // iOS uses the same web origin when Associated Domains are configured properly

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: storedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        credential: {
          id: credentialRecord.credentialId,
          publicKey: Buffer.from(credentialRecord.publicKey, "base64url"),
          counter: Number(credentialRecord.counter),
          transports: credentialRecord.transports as AuthenticatorTransport[] | undefined,
        },
        requireUserVerification: true,
      });
    } catch (verifyError: any) {
      console.error("WebAuthn auth verification error:", verifyError);
      console.error("Expected origins:", expectedOrigins);
      console.error("Credential response:", JSON.stringify(credential.response, null, 2));
      return NextResponse.json(
        { error: verifyError.message || "Authentication failed" },
        { status: 400 }
      );
    }

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 400 }
      );
    }

    // Update counter and lastUsedAt for replay attack prevention
    await db
      .update(passkeyCredentials)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(passkeyCredentials.id, credentialRecord.id));

    // Fetch user to verify they exist and are authorized
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.authorized) {
      return NextResponse.json(
        { error: "Account not approved. Please wait for admin approval." },
        { status: 403 }
      );
    }

    // Clear cookies
    cookieStore.delete("webauthn_auth_challenge");
    cookieStore.delete("webauthn_auth_user_id");
    cookieStore.delete("webauthn_auth_mode");

    // Create a short-lived JWT token for passkey authentication
    // This token will be used by NextAuth to create a session
    const passkeyToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        credentialId: credential.id,
        authMethod: "passkey",
      },
      JWT_SECRET,
      {
        expiresIn: "5m", // Short-lived for security
      }
    );

    // Update last login
    await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      verified: true,
      token: passkeyToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    console.error("WebAuthn authentication verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
