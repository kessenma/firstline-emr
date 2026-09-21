// apps/web/app/api/auth/webauthn/register/options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { db } from "@/db/connection";
import { users, passkeyCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

// WebAuthn Relying Party configuration
const rpName = process.env.WEBAUTHN_RP_NAME || "Fajr Mission EMR";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get existing user if userId provided, otherwise check if email exists
    let user = null;
    let userIdToUse = userId;

    if (userId) {
      // Existing user adding a passkey
      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    } else {
      // During signup - check if email is already registered
      user = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      if (user) {
        // User exists, use their ID
        userIdToUse = user.id;
      } else {
        // New user during signup - generate a temporary ID
        // This will be replaced with the real ID after user creation
        userIdToUse = uuidv4();
      }
    }

    // Get existing credentials for this user (for excludeCredentials)
    const existingCredentials = user
      ? await db.query.passkeyCredentials.findMany({
          where: and(
            eq(passkeyCredentials.userId, user.id),
            eq(passkeyCredentials.isActive, true)
          ),
        })
      : [];

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userIdToUse),
      userName: normalizedEmail,
      userDisplayName: user ? `${user.firstName} ${user.lastName}` : normalizedEmail,
      // Don't allow re-registering existing credentials
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransport[] | undefined,
      })),
      authenticatorSelection: {
        // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
        authenticatorAttachment: "platform",
        // Require user verification (biometric/PIN)
        userVerification: "required",
        // Prefer resident keys for better UX (discoverable credentials)
        residentKey: "preferred",
      },
      // Request attestation for device info (not strictly verified)
      attestationType: "none",
    });

    // Store challenge in httpOnly cookie (expires in 5 minutes)
    const cookieStore = await cookies();
    cookieStore.set("webauthn_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    // Also store the user ID for verification
    cookieStore.set("webauthn_user_id", userIdToUse, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    // Store email for signup flow
    cookieStore.set("webauthn_email", normalizedEmail, {
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
        userId: userIdToUse,
        email: normalizedEmail,
      },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

    return NextResponse.json({ ...options, challengeToken });
  } catch (error) {
    console.error("WebAuthn registration options error:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}
