// apps/web/app/api/auth/webauthn/verify-test/route.ts
// VERIFICATION-ONLY passkey check for the post-migration Verify-Auth tool.
// Mirrors /api/auth/webauthn/authenticate/verify but creates NO session/token
// and mutates NOTHING — it just proves a migrated passkey still authenticates
// against this server's passkey_credentials and WebAuthn RP-ID/origin.
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { db } from "@/db/connection";
import { passkeyCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const webOrigin =
  process.env.WEBAUTHN_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000";
const androidOrigin = process.env.WEBAUTHN_ANDROID_ORIGIN;

export async function POST(request: NextRequest) {
  try {
    const { credential, challengeToken } = (await request.json()) as {
      credential: AuthenticationResponseJSON;
      challengeToken?: string;
    };

    if (!credential || !challengeToken) {
      return NextResponse.json(
        { ok: false, error: "Missing credential or challenge" },
        { status: 400 },
      );
    }

    // Decode the challenge issued by the options endpoint (cookie-free path).
    let challenge: string;
    try {
      const decoded = jwt.verify(challengeToken, JWT_SECRET) as {
        challenge: string;
      };
      challenge = decoded.challenge;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Challenge expired. Please try again." },
        { status: 400 },
      );
    }

    // Discoverable lookup by credential id (the passkey identifies the user).
    const credentialRecord = await db.query.passkeyCredentials.findFirst({
      where: and(
        eq(passkeyCredentials.credentialId, credential.id),
        eq(passkeyCredentials.isActive, true),
      ),
    });

    if (!credentialRecord) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This passkey is not in the database — it did not migrate, or was registered elsewhere.",
        },
        { status: 404 },
      );
    }

    const expectedOrigins = [webOrigin];
    if (androidOrigin) expectedOrigins.push(androidOrigin);

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        credential: {
          id: credentialRecord.credentialId,
          publicKey: Buffer.from(credentialRecord.publicKey, "base64url"),
          counter: Number(credentialRecord.counter),
          transports: credentialRecord.transports as
            | AuthenticatorTransport[]
            | undefined,
        },
        requireUserVerification: true,
      });
    } catch (verifyError: any) {
      // A mismatched RP-ID/origin (domain changed on migration) lands here.
      return NextResponse.json(
        {
          ok: false,
          error:
            verifyError?.message ||
            "Passkey verification failed (domain / RP-ID may have changed).",
          rpId: rpID,
        },
        { status: 400 },
      );
    }

    if (!verification.verified) {
      return NextResponse.json(
        { ok: false, error: "Passkey verification failed.", rpId: rpID },
        { status: 400 },
      );
    }

    // Read-only: identify the owner but do NOT create a session, mint a token,
    // or update the counter/lastUsedAt.
    const user = await db.query.users.findFirst({
      where: eq(users.id, credentialRecord.userId),
    });

    return NextResponse.json({
      ok: true,
      rpId: rpID,
      credentialId: credential.id,
      deviceName: credentialRecord.deviceName,
      user: user
        ? { id: user.id, email: user.email, firstName: user.firstName }
        : null,
    });
  } catch (error) {
    console.error("Passkey verify-test error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to verify passkey" },
      { status: 500 },
    );
  }
}
