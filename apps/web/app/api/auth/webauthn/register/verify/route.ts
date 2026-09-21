// apps/web/app/api/auth/webauthn/register/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { cookies } from "next/headers";
import { db } from "@/db/connection";
import { passkeyCredentials, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

// WebAuthn Relying Party configuration
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const webOrigin = process.env.WEBAUTHN_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000";
// Mobile origins: Android uses android:apk-key-hash format, iOS uses https domain with associated domains
const androidOrigin = process.env.WEBAUTHN_ANDROID_ORIGIN;
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, userId, deviceName, challengeToken } = body as {
      credential: RegistrationResponseJSON;
      userId?: string;
      deviceName?: string;
      challengeToken?: string; // For mobile clients that can't use cookies
    };

    if (!credential) {
      return NextResponse.json(
        { error: "Credential is required" },
        { status: 400 }
      );
    }

    // Get stored challenge and user ID - try cookies first, then fallback to challengeToken
    const cookieStore = await cookies();
    let storedChallenge = cookieStore.get("webauthn_challenge")?.value;
    let storedUserId = userId || cookieStore.get("webauthn_user_id")?.value;
    let storedEmail = cookieStore.get("webauthn_email")?.value;

    // If no cookie challenge, try to extract from challengeToken (for mobile)
    if (!storedChallenge && challengeToken) {
      try {
        const decoded = jwt.verify(challengeToken, JWT_SECRET) as {
          challenge: string;
          userId: string;
          email: string;
        };
        storedChallenge = decoded.challenge;
        storedUserId = userId || decoded.userId;
        storedEmail = decoded.email;
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

    if (!storedUserId) {
      return NextResponse.json(
        { error: "User ID not found. Please try again." },
        { status: 400 }
      );
    }

    // Support multiple origins: web origin + optional Android/iOS origins
    const expectedOrigins: string[] = [webOrigin];
    if (androidOrigin) {
      expectedOrigins.push(androidOrigin);
    }

    // Verify the registration response
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: storedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (verifyError: any) {
      console.error("WebAuthn verification error:", verifyError);
      console.error("Expected origins:", expectedOrigins);
      return NextResponse.json(
        { error: verifyError.message || "Verification failed" },
        { status: 400 }
      );
    }

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    const {
      credential: verifiedCredential,
      credentialDeviceType,
      credentialBackedUp,
      aaguid,
    } = verification.registrationInfo;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, storedUserId),
    });

    // For signup flow, the user might not exist yet
    // In this case, we return the credential data to be stored after user creation
    if (!existingUser) {
      // Clear cookies
      cookieStore.delete("webauthn_challenge");
      cookieStore.delete("webauthn_user_id");
      cookieStore.delete("webauthn_email");

      // Return credential data for later storage (during signup completion)
      return NextResponse.json({
        verified: true,
        pendingCredential: {
          credentialId: verifiedCredential.id,
          publicKey: Buffer.from(verifiedCredential.publicKey).toString("base64url"),
          counter: verifiedCredential.counter,
          credentialDeviceType,
          credentialBackedUp,
          transports: credential.response.transports || [],
          deviceName: deviceName || "Primary Device",
          aaguid,
        },
        email: storedEmail,
        tempUserId: storedUserId,
      });
    }

    // User exists - store the credential directly
    await db.insert(passkeyCredentials).values({
      userId: storedUserId,
      credentialId: verifiedCredential.id,
      publicKey: Buffer.from(verifiedCredential.publicKey).toString("base64url"),
      counter: verifiedCredential.counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: credential.response.transports || [],
      deviceName: deviceName || "My Device",
      aaguid,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Clear cookies
    cookieStore.delete("webauthn_challenge");
    cookieStore.delete("webauthn_user_id");
    cookieStore.delete("webauthn_email");

    return NextResponse.json({
      verified: true,
      message: "Passkey registered successfully",
    });
  } catch (error) {
    console.error("WebAuthn registration verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}
