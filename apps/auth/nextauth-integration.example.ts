/**
 * Example NextAuth Integration with Zitadel SSO
 *
 * This file shows how to add Zitadel as an OIDC provider to your existing
 * NextAuth configuration in apps/web/lib/auth.ts
 *
 * After setting up Zitadel and creating an application for MedFlow EMR,
 * add this provider alongside your existing CredentialsProvider.
 */

import type { NextAuthConfig } from "next-auth";

// Add this to your existing providers array in auth.ts
export const zitadelProvider = {
  id: "zitadel",
  name: "Fajr SSO",
  type: "oidc" as const,

  // Zitadel OIDC configuration
  issuer: process.env.ZITADEL_ISSUER || "https://identity.fajrmission.org",
  clientId: process.env.ZITADEL_CLIENT_ID!,
  clientSecret: process.env.ZITADEL_CLIENT_SECRET!,

  authorization: {
    params: {
      scope: "openid profile email",
      // Request specific claims if needed
      // scope: "openid profile email urn:zitadel:iam:user:metadata",
    },
  },

  // Map Zitadel user info to your session structure
  profile(profile: ZitadelProfile) {
    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      image: profile.picture,
      // Map to your custom fields
      firstName: profile.given_name,
      lastName: profile.family_name,
    };
  },
};

// Zitadel profile type
interface ZitadelProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  preferred_username: string;
  picture?: string;
  locale?: string;
  updated_at?: number;
}

/**
 * Example of how to modify your existing auth.ts callbacks
 * to handle both Zitadel SSO and existing credentials
 */
export const ssoCallbackExample = {
  async signIn({ user, account, profile }) {
    // Handle Zitadel SSO login
    if (account?.provider === "zitadel") {
      // Option 1: Auto-create user if they don't exist in your DB
      // const existingUser = await findUserByEmail(user.email);
      // if (!existingUser) {
      //   await createUser({ email: user.email, ... });
      // }

      // Option 2: Only allow existing users
      // const existingUser = await findUserByEmail(user.email);
      // if (!existingUser) {
      //   return false; // Deny login
      // }

      return true;
    }

    // Existing credentials logic continues to work
    return true;
  },

  async jwt({ token, user, account, profile }) {
    // On initial sign in
    if (account && user) {
      if (account.provider === "zitadel") {
        // Store Zitadel tokens for potential API calls
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.provider = "zitadel";

        // Look up user in your database to get full profile
        // const dbUser = await findUserByEmail(user.email);
        // if (dbUser) {
        //   token.accountType = dbUser.accountType;
        //   token.isAdmin = dbUser.isAdmin;
        //   // ... other fields
        // }
      }
    }

    return token;
  },

  async session({ session, token }) {
    // Add custom fields to session
    if (token.provider === "zitadel") {
      session.user.id = token.sub as string;
      // session.user.accountType = token.accountType;
      // session.user.isAdmin = token.isAdmin;
    }

    return session;
  },
};

/**
 * Full integration example
 *
 * Your auth.ts would look something like:
 *
 * ```typescript
 * import NextAuth from "next-auth";
 * import Credentials from "next-auth/providers/credentials";
 *
 * export const { handlers, signIn, signOut, auth } = NextAuth({
 *   providers: [
 *     // Existing credentials provider
 *     Credentials({
 *       // ... your existing config
 *     }),
 *
 *     // Add Zitadel SSO
 *     {
 *       id: "zitadel",
 *       name: "Fajr SSO",
 *       type: "oidc",
 *       issuer: process.env.ZITADEL_ISSUER,
 *       clientId: process.env.ZITADEL_CLIENT_ID!,
 *       clientSecret: process.env.ZITADEL_CLIENT_SECRET!,
 *     },
 *   ],
 *
 *   callbacks: {
 *     // Merge with existing callbacks
 *   },
 * });
 * ```
 */
