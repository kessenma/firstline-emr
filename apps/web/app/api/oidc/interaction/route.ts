// apps/web/app/api/oidc/interaction/route.ts
// API endpoint to handle OIDC interaction completion after login

import { NextRequest, NextResponse } from 'next/server';
import { verifyOidcLogin, verifyOidcPasskeyLogin } from '@/lib/oidc-provider';
import { db } from '@/db/connection';
import { oidcInteractions, oidcAuthorizationCodes } from '@/db/schema/oidc';
import { passkeyCredentials, totpCredentials, users } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { FeatureFlags } from '@/lib/featureFlags';

// Use the same JWT_SECRET derivation as the passkey verify endpoint
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

// GET - Get interaction details
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const interactionId = url.searchParams.get('uid');

    if (!interactionId) {
      return NextResponse.json(
        { error: 'Missing interaction UID' },
        { status: 400 }
      );
    }

    // Get the interaction from database
    const result = await db
      .select()
      .from(oidcInteractions)
      .where(eq(oidcInteractions.id, interactionId))
      .limit(1);

    if (!result.length) {
      return NextResponse.json(
        { error: 'Interaction not found or expired' },
        { status: 404 }
      );
    }

    const interaction = result[0];

    // Check if expired
    if (new Date(interaction.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Interaction expired' },
        { status: 404 }
      );
    }

    const payload = interaction.payload as any;

    // Return non-sensitive interaction info
    return NextResponse.json({
      uid: interactionId,
      prompt: payload.prompt,
      params: {
        client_id: payload.params.client_id,
        redirect_uri: payload.params.redirect_uri,
        scope: payload.params.scope,
        login_hint: payload.params.login_hint,
      },
    });
  } catch (error: any) {
    console.error('OIDC interaction GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get interaction details' },
      { status: 500 }
    );
  }
}

// POST - Complete the interaction (login)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, email, password, passkeyToken } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing interaction UID' },
        { status: 400 }
      );
    }

    // Get the interaction from database
    const result = await db
      .select()
      .from(oidcInteractions)
      .where(eq(oidcInteractions.id, uid))
      .limit(1);

    if (!result.length) {
      return NextResponse.json(
        { error: 'Interaction not found or expired' },
        { status: 404 }
      );
    }

    const interaction = result[0];

    // Check if expired
    if (new Date(interaction.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Interaction expired' },
        { status: 404 }
      );
    }

    const interactionPayload = interaction.payload as any;
    let account = null;

    // Verify credentials
    if (passkeyToken) {
      // Verify passkey token
      try {
        const decoded = jwt.verify(passkeyToken, JWT_SECRET) as {
          userId: string;
          email: string;
          credentialId: string;
          authMethod: string;
          iat: number;
        };

        // Verify token is not too old (5 minutes max)
        if (Date.now() / 1000 - decoded.iat > 300) {
          return NextResponse.json(
            { error: 'Passkey token expired. Please try again.' },
            { status: 401 }
          );
        }

        account = await verifyOidcPasskeyLogin(decoded.userId, decoded.email);
      } catch (tokenError: any) {
        console.error('Passkey token verification failed:', tokenError);
        return NextResponse.json(
          { error: 'Invalid passkey authentication' },
          { status: 401 }
        );
      }
    } else if (email && password) {
      // Verify email/password
      account = await verifyOidcLogin(email, password);
    } else {
      return NextResponse.json(
        { error: 'Email/password or passkey token required' },
        { status: 400 }
      );
    }

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid credentials or not an admin' },
        { status: 401 }
      );
    }

    // 2FA enforcement for password-based logins (passkey already satisfies 2FA)
    const isPasswordLogin = !!password && !passkeyToken;
    if (isPasswordLogin && !FeatureFlags.SKIP_2FA_IN_DEV) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (user) {
        const [pkCount] = await db
          .select({ count: count() })
          .from(passkeyCredentials)
          .where(and(eq(passkeyCredentials.userId, user.id), eq(passkeyCredentials.isActive, true)));
        const [totpCount] = await db
          .select({ count: count() })
          .from(totpCredentials)
          .where(and(eq(totpCredentials.userId, user.id), eq(totpCredentials.isActive, true), eq(totpCredentials.isVerified, true)));

        const hasPasskey = (pkCount?.count ?? 0) > 0;
        const hasTotp = (totpCount?.count ?? 0) > 0;

        if (hasPasskey || hasTotp) {
          const methods: string[] = [];
          if (hasTotp) methods.push('totp');
          if (hasPasskey) methods.push('passkey');

          const loginToken = jwt.sign(
            { userId: user.id, email: user.email, purpose: '2fa_login', oidcUid: uid },
            JWT_SECRET,
            { expiresIn: '5m' },
          );

          return NextResponse.json({
            requires2FA: true,
            loginToken,
            methods,
          });
        }
      }
    }

    // Generate authorization code
    const authorizationCode = randomUUID();
    const grantId = randomUUID();

    // Store authorization code in database
    await db.insert(oidcAuthorizationCodes).values({
      id: authorizationCode,
      grantId,
      payload: {
        accountId: account.accountId,
        clientId: interactionPayload.params.client_id,
        redirect_uri: interactionPayload.params.redirect_uri,
        scope: interactionPayload.params.scope,
        state: interactionPayload.params.state,
        nonce: interactionPayload.params.nonce,
        code_challenge: interactionPayload.params.code_challenge,
        code_challenge_method: interactionPayload.params.code_challenge_method,
      },
      expiresAt: new Date(Date.now() + 600 * 1000), // 10 minutes
    });

    // Delete the interaction (it's been used)
    await db.delete(oidcInteractions).where(eq(oidcInteractions.id, uid));

    // Build redirect URL with authorization code
    const redirectUri = interactionPayload.params.redirect_uri;
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authorizationCode);

    if (interactionPayload.params.state) {
      redirectUrl.searchParams.set('state', interactionPayload.params.state);
    }

    return NextResponse.json({
      success: true,
      redirectUrl: redirectUrl.toString(),
      account: {
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
      },
    });
  } catch (error: any) {
    console.error('OIDC interaction POST error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to complete login' },
      { status: 500 }
    );
  }
}
