// apps/web/lib/oidc-provider.ts
// OIDC Provider configuration for the web app acting as an Identity Provider

import Provider, {
  Configuration,
  KoaContextWithOIDC,
  Account,
  FindAccount,
  ClaimsParameterMember,
  Interaction,
  errors,
} from 'oidc-provider';
import { createOidcAdapter } from './oidc-adapter';
import { db } from '@/db/connection';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Types
export interface OidcAccount {
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

// Get the issuer URL from environment or default
const getIssuerUrl = (): string => {
  // In production, use the actual domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.OIDC_ISSUER_URL || 'https://fajrmission.org';
  }
  // In development, use localhost
  return process.env.OIDC_ISSUER_URL || 'http://localhost:3000';
};

// Get the Zitadel callback URL
const getZitadelCallbackUrl = (): string => {
  return process.env.ZITADEL_CALLBACK_URL ||
    'https://identity.fajrmission.org/ui/login/login/externalidp/callback';
};

// Find account by ID - used by oidc-provider to look up users
const findAccount: FindAccount = async (
  ctx: KoaContextWithOIDC,
  id: string,
  token?: any
): Promise<Account | undefined> => {
  try {
    // Look up user in database
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        admin: true,
      },
    });

    if (!user) {
      console.log(`OIDC: User not found: ${id}`);
      return undefined;
    }

    // Check if user is an admin
    const isAdmin = !!user.admin;

    // IMPORTANT: Only allow admins to authenticate via OIDC
    // This ensures only admins can access protected services like analytics
    if (!isAdmin) {
      console.log(`OIDC: User ${user.email} is not an admin, denying access`);
      return undefined;
    }

    return {
      accountId: user.id,
      async claims(
        use: string,
        scope: string,
        claims: { [key: string]: ClaimsParameterMember | null },
        rejected: string[]
      ) {
        return {
          sub: user.id,
          email: user.email,
          email_verified: true, // Assuming email is verified if they can log in
          name: `${user.firstName} ${user.lastName}`,
          given_name: user.firstName,
          family_name: user.lastName,
          // Custom claims
          is_admin: isAdmin,
        };
      },
    };
  } catch (error) {
    console.error('OIDC findAccount error:', error);
    return undefined;
  }
};

// Verify a user's credentials - returns user if valid admin, undefined otherwise
export async function verifyOidcLogin(
  email: string,
  password: string
): Promise<OidcAccount | null> {
  const bcrypt = await import('bcryptjs');

  try {
    // Look up user by email (case-insensitive)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: {
        admin: true,
      },
    });

    if (!user) {
      return null;
    }

    // Check if user has a password
    if (!user.password) {
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // Check if user is authorized
    if (!user.authorized) {
      return null;
    }

    // Check if user is an admin
    if (!user.admin) {
      return null;
    }

    return {
      accountId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: true,
    };
  } catch (error) {
    console.error('OIDC verifyOidcLogin error:', error);
    return null;
  }
}

// Verify passkey login - returns user if valid admin, undefined otherwise
export async function verifyOidcPasskeyLogin(
  userId: string,
  email: string
): Promise<OidcAccount | null> {
  try {
    // Look up user by ID
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        admin: true,
      },
    });

    if (!user) {
      return null;
    }

    // Verify email matches
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return null;
    }

    // Check if user is authorized
    if (!user.authorized) {
      return null;
    }

    // Check if user is an admin
    if (!user.admin) {
      return null;
    }

    return {
      accountId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: true,
    };
  } catch (error) {
    console.error('OIDC verifyOidcPasskeyLogin error:', error);
    return null;
  }
}

// Create OIDC provider configuration
export function createOidcConfiguration(): Configuration {
  const issuer = getIssuerUrl();
  const zitadelCallback = getZitadelCallbackUrl();

  // Cookie keys - use OIDC_PROVIDER_SECRET or NEXTAUTH_SECRET as fallback
  const cookieKeys = [
    process.env.OIDC_PROVIDER_SECRET || process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  ];

  return {
    // Use our custom adapter for database persistence
    adapter: createOidcAdapter,

    // Registered clients (Zitadel)
    clients: [
      {
        client_id: process.env.OIDC_ZITADEL_CLIENT_ID || 'fajr-emr-oidc',
        client_secret: process.env.OIDC_ZITADEL_CLIENT_SECRET,
        redirect_uris: [
          zitadelCallback,
          // Allow additional callback URLs in development
          ...(process.env.NODE_ENV !== 'production'
            ? ['http://localhost:8080/ui/login/login/externalidp/callback']
            : []
          ),
        ],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_basic',
        // Scopes this client can request
        scope: 'openid profile email',
      },
    ],

    // Claims configuration
    claims: {
      openid: ['sub'],
      profile: ['name', 'given_name', 'family_name'],
      email: ['email', 'email_verified'],
    },

    // Find account function
    findAccount,

    // Features
    features: {
      // Disable development interactions (we have our own login page)
      devInteractions: { enabled: false },

      // Enable refresh tokens
      revocation: { enabled: true },

      // Enable introspection for tokens
      introspection: { enabled: true },

      // Enable userinfo endpoint
      userinfo: { enabled: true },
    },

    // Interactions - redirect to our login page
    interactions: {
      url(ctx: KoaContextWithOIDC, interaction: Interaction) {
        // Redirect to our custom OIDC login page
        return `/oidc/login?interaction=${interaction.uid}`;
      },
    },

    // Cookie configuration
    cookies: {
      keys: cookieKeys,
      short: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
      long: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    },

    // Token TTLs
    ttl: {
      AccessToken: 3600, // 1 hour
      AuthorizationCode: 600, // 10 minutes
      IdToken: 3600, // 1 hour
      RefreshToken: 86400, // 1 day
      Interaction: 3600, // 1 hour
      Session: 86400, // 1 day
      Grant: 86400, // 1 day
      DeviceCode: 600, // 10 minutes
      BackchannelAuthenticationRequest: 600, // 10 minutes
      ClientCredentials: 600, // 10 minutes
    },

    // PKCE configuration - require for public clients
    pkce: {
      required: () => false, // Not required for confidential clients like Zitadel
    },

    // Extra params to accept
    extraParams: ['login_hint'],

    // Render errors
    renderError: async (
      ctx: KoaContextWithOIDC,
      out: { error: string; error_description?: string },
      error: Error
    ) => {
      console.error('OIDC Error:', error);
      ctx.type = 'html';
      ctx.body = `<!DOCTYPE html>
<html>
<head>
  <title>Authentication Error</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; }
    .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
    h1 { color: #c00; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Authentication Error</h1>
    <p>${out.error_description || out.error || 'An error occurred during authentication'}</p>
    <p><a href="/">Return to home</a></p>
  </div>
</body>
</html>`;
    },

    // Custom routes configuration
    routes: {
      authorization: '/auth',
      token: '/token',
      userinfo: '/userinfo',
      jwks: '/jwks',
      revocation: '/token/revocation',
      introspection: '/token/introspection',
      end_session: '/session/end',
    },
  };
}

// Singleton provider instance
let providerInstance: Provider | null = null;

// Get or create the OIDC provider instance
export function getOidcProvider(): Provider {
  if (!providerInstance) {
    const issuer = getIssuerUrl() + '/api/oidc';
    const configuration = createOidcConfiguration();

    providerInstance = new Provider(issuer, configuration);

    // Add error handling
    providerInstance.on('server_error', (ctx: KoaContextWithOIDC, err: Error) => {
      console.error('OIDC Server Error:', err);
    });

    providerInstance.on('authorization.error', (ctx: KoaContextWithOIDC, err: Error) => {
      console.error('OIDC Authorization Error:', err);
    });

    providerInstance.on('grant.error', (ctx: KoaContextWithOIDC, err: Error) => {
      console.error('OIDC Grant Error:', err);
    });
  }

  return providerInstance;
}

// Handle an OIDC request using the provider's callback
export async function handleOidcRequest(req: Request): Promise<Response> {
  const provider = getOidcProvider();

  // Convert Next.js Request to something oidc-provider can handle
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/oidc', '') || '/';

  // Create a mock Koa context for the provider
  // This is a simplified approach - for production, consider using a proper adapter
  const callback = provider.callback();

  // For now, we'll handle this differently in the route handler
  throw new Error('Use provider.callback() directly with proper Koa integration');
}
