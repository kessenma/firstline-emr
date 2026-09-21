// apps/web/app/api/oidc/[...oidc]/route.ts
// Catch-all handler for OIDC provider endpoints
// Handles endpoints manually due to oidc-provider's Koa incompatibility with Next.js App Router

import { NextRequest, NextResponse } from 'next/server';
import { getOidcProvider } from '@/lib/oidc-provider';
import { randomUUID, generateKeyPairSync, createHash } from 'crypto';
import { db } from '@/db/connection';
import { oidcInteractions, oidcAuthorizationCodes, oidcAccessTokens } from '@/db/schema/oidc';
import { eq } from 'drizzle-orm';

// RSA key pair for signing tokens - generated once per process
let rsaKeyPair: { privateKey: string; publicKey: string } | null = null;
let jwksCache: { keys: any[] } | null = null;

function getRsaKeyPair() {
  if (!rsaKeyPair) {
    // Generate RSA key pair
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    rsaKeyPair = { privateKey, publicKey };
  }
  return rsaKeyPair;
}

// Convert PEM public key to JWK format
function publicKeyToJwk(publicKeyPem: string): any {
  const crypto = require('crypto');
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const jwk = publicKey.export({ format: 'jwk' });

  // Add required OIDC fields
  return {
    ...jwk,
    kid: createHash('sha256').update(publicKeyPem).digest('hex').substring(0, 16),
    use: 'sig',
    alg: 'RS256',
  };
}

function getJwks() {
  if (!jwksCache) {
    const { publicKey } = getRsaKeyPair();
    jwksCache = {
      keys: [publicKeyToJwk(publicKey)],
    };
  }
  return jwksCache;
}

// Main handler for OIDC requests
async function handleOidcRequest(req: NextRequest): Promise<Response> {
  try {
    const provider = getOidcProvider();
    const url = new URL(req.url);

    // Remove /api/oidc prefix to get the OIDC path
    const oidcPath = url.pathname.replace('/api/oidc', '') || '/';

    // Handle well-known configuration endpoint
    if (oidcPath === '/.well-known/openid-configuration') {
      const issuer = provider.issuer;
      const config = {
        issuer,
        authorization_endpoint: `${issuer}/auth`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/jwks`,
        revocation_endpoint: `${issuer}/token/revocation`,
        introspection_endpoint: `${issuer}/token/introspection`,
        end_session_endpoint: `${issuer}/session/end`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'profile', 'email'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
        claims_supported: [
          'sub',
          'email',
          'email_verified',
          'name',
          'given_name',
          'family_name',
        ],
        code_challenge_methods_supported: ['S256'],
      };

      return NextResponse.json(config);
    }

    // Handle JWKS endpoint
    if (oidcPath === '/jwks') {
      try {
        const jwks = getJwks();
        return NextResponse.json(jwks);
      } catch (error) {
        console.error('JWKS error:', error);
        // Return empty keys if not available yet
        return NextResponse.json({ keys: [] });
      }
    }

    // Handle Authorization endpoint - redirect to login page
    if (oidcPath === '/auth') {
      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      const responseType = url.searchParams.get('response_type');
      const scope = url.searchParams.get('scope');
      const state = url.searchParams.get('state');
      const nonce = url.searchParams.get('nonce');
      const codeChallenge = url.searchParams.get('code_challenge');
      const codeChallengeMethod = url.searchParams.get('code_challenge_method');

      // Validate required parameters
      if (!clientId || !redirectUri || !responseType) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Missing required parameters' },
          { status: 400 }
        );
      }

      // Validate client_id
      const expectedClientId = process.env.OIDC_ZITADEL_CLIENT_ID || 'fajr-emr-oidc';
      if (clientId !== expectedClientId) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: 'Unknown client' },
          { status: 400 }
        );
      }

      // Validate response_type
      if (responseType !== 'code') {
        return NextResponse.json(
          { error: 'unsupported_response_type', error_description: 'Only code response type is supported' },
          { status: 400 }
        );
      }

      // Create interaction and store in database
      const interactionId = randomUUID();
      const interactionPayload = {
        params: {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          scope: scope || 'openid',
          state,
          nonce,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        },
        prompt: { name: 'login' },
        uid: interactionId,
      };

      // Store interaction in database
      await db.insert(oidcInteractions).values({
        id: interactionId,
        payload: interactionPayload,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      });

      // Redirect to login page - use NEXTAUTH_URL for production domain
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'https://fajrmission.org';
      const loginUrl = new URL('/oidc/login', baseUrl);
      loginUrl.searchParams.set('interaction', interactionId);

      return NextResponse.redirect(loginUrl.toString());
    }

    // Handle Token endpoint
    if (oidcPath === '/token' && req.method === 'POST') {
      // Parse the body
      const contentType = req.headers.get('content-type') || '';
      let body: Record<string, string> = {};

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        body = Object.fromEntries(new URLSearchParams(text));
      } else if (contentType.includes('application/json')) {
        body = await req.json();
      }

      const grantType = body.grant_type;
      const code = body.code;
      const redirectUri = body.redirect_uri;

      // Validate client authentication
      let clientId: string | null = body.client_id || null;
      let clientSecret: string | null = body.client_secret || null;

      // Check Authorization header for Basic auth
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Basic ')) {
        const base64Credentials = authHeader.slice(6);
        const credentials = atob(base64Credentials);
        const [id, secret] = credentials.split(':');
        clientId = decodeURIComponent(id);
        clientSecret = decodeURIComponent(secret);
      }

      // Validate client credentials
      const expectedClientId = process.env.OIDC_ZITADEL_CLIENT_ID || 'fajr-emr-oidc';
      const expectedClientSecret = process.env.OIDC_ZITADEL_CLIENT_SECRET;

      if (clientId !== expectedClientId || clientSecret !== expectedClientSecret) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: 'Invalid client credentials' },
          { status: 401 }
        );
      }

      if (grantType === 'authorization_code') {
        if (!code) {
          return NextResponse.json(
            { error: 'invalid_request', error_description: 'Missing code parameter' },
            { status: 400 }
          );
        }

        // Look up the authorization code
        const authCodeResult = await db
          .select()
          .from(oidcAuthorizationCodes)
          .where(eq(oidcAuthorizationCodes.id, code))
          .limit(1);

        if (!authCodeResult.length) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Invalid authorization code' },
            { status: 400 }
          );
        }

        const authCode = authCodeResult[0];

        // Check if expired
        if (new Date(authCode.expiresAt) < new Date()) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Authorization code expired' },
            { status: 400 }
          );
        }

        // Check if already consumed
        if (authCode.consumedAt) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Authorization code already used' },
            { status: 400 }
          );
        }

        const payload = authCode.payload as any;

        // Validate redirect_uri matches
        if (redirectUri && redirectUri !== payload.redirect_uri) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
            { status: 400 }
          );
        }

        // Mark code as consumed
        await db
          .update(oidcAuthorizationCodes)
          .set({ consumedAt: new Date() })
          .where(eq(oidcAuthorizationCodes.id, code));

        // Generate tokens
        const accessToken = randomUUID();
        const idToken = await generateIdToken(payload.accountId, payload.nonce, clientId);

        // Store access token
        await db.insert(oidcAccessTokens).values({
          id: accessToken,
          grantId: authCode.grantId,
          payload: {
            accountId: payload.accountId,
            clientId,
            scope: payload.scope,
          },
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        });

        return NextResponse.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: idToken,
          scope: payload.scope,
        });
      }

      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Grant type not supported' },
        { status: 400 }
      );
    }

    // Handle Userinfo endpoint
    if (oidcPath === '/userinfo') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'invalid_token', error_description: 'Missing or invalid access token' },
          { status: 401 }
        );
      }

      const accessToken = authHeader.slice(7);

      // Look up the access token
      const tokenResult = await db
        .select()
        .from(oidcAccessTokens)
        .where(eq(oidcAccessTokens.id, accessToken))
        .limit(1);

      if (!tokenResult.length) {
        return NextResponse.json(
          { error: 'invalid_token', error_description: 'Invalid access token' },
          { status: 401 }
        );
      }

      const token = tokenResult[0];

      // Check if expired
      if (new Date(token.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: 'invalid_token', error_description: 'Access token expired' },
          { status: 401 }
        );
      }

      const payload = token.payload as any;

      // Get user info from database
      const { users } = await import('@/db/schema');
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.accountId))
        .limit(1);

      if (!userResult.length) {
        return NextResponse.json(
          { error: 'invalid_token', error_description: 'User not found' },
          { status: 401 }
        );
      }

      const user = userResult[0];

      return NextResponse.json({
        sub: user.id,
        email: user.email,
        email_verified: true,
        name: `${user.firstName} ${user.lastName}`,
        given_name: user.firstName,
        family_name: user.lastName,
      });
    }

    // Default: endpoint not found
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Endpoint not found' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('OIDC handler error:', error);

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error.message || 'An internal error occurred',
      },
      { status: 500 }
    );
  }
}

// Generate ID token (JWT) signed with RS256
async function generateIdToken(
  accountId: string,
  nonce: string | null,
  clientId: string
): Promise<string> {
  const jwt = await import('jsonwebtoken');
  const { users } = await import('@/db/schema');

  // Get user info
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, accountId))
    .limit(1);

  if (!userResult.length) {
    throw new Error('User not found');
  }

  const user = userResult[0];
  const issuer = process.env.NODE_ENV === 'production'
    ? 'https://fajrmission.org/api/oidc'
    : 'http://localhost:3000/api/oidc';

  // Get the key ID from JWKS
  const jwks = getJwks();
  const kid = jwks.keys[0]?.kid;

  const payload: any = {
    iss: issuer,
    sub: user.id,
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    iat: Math.floor(Date.now() / 1000),
    email: user.email,
    email_verified: true,
    name: `${user.firstName} ${user.lastName}`,
    given_name: user.firstName,
    family_name: user.lastName,
  };

  if (nonce) {
    payload.nonce = nonce;
  }

  // Sign with RS256 using our RSA private key
  const { privateKey } = getRsaKeyPair();

  return jwt.default.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: { alg: 'RS256', typ: 'JWT', kid },
  });
}

export async function GET(req: NextRequest) {
  return handleOidcRequest(req);
}

export async function POST(req: NextRequest) {
  return handleOidcRequest(req);
}
