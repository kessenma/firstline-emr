// apps/web/lib/auth.ts
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Account, Profile } from "next-auth";

// Use the same JWT_SECRET as mobile-login and WebAuthn endpoints for consistency
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

import { db } from "@/db/connection";
import { users, admins, userSettings, passkeyCredentials, totpCredentials } from "@/db/schema";
import { FeatureFlags } from "@/lib/featureFlags";
import { eq, and, count as drizzleCount } from "drizzle-orm";
import { JWT_CONFIG } from "@/lib/jwt-config";
import { Languages } from "@/data/languages.enum";
import { Countries } from "@/data/countries.enum";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { storageService } from "@/lib/storage";

type AccountType = "Doctor" | "Triage" | "Evac";

const isDev = process.env.NODE_ENV !== "production";

// Custom JWT interface with all necessary properties
interface ExtendedJWT {
  // Base JWT properties
  sub?: string;
  iat?: number;
  exp?: number;
  jti?: string;
  // Custom properties
  storageImage?: string;
  id: string;
  email?: string;
  accountType?: AccountType;
  firstName?: string;
  lastName?: string;
  city?: string;
  countries?: Countries[];
  languages?: Languages[];
  isAdmin?: boolean;
  dob?: string | Date;
  doctorSpecialty?: DoctorSpecialtyList[];
  gender?: "Male" | "Female";
  image?: string;
  userSettingsId?: string;
  accessToken?: string;
}

interface SessionUser extends NextAuthUser {
  id: string;
  _id: string;
  email: string;
  accountType: AccountType;
  firstName: string;
  lastName: string;
  city: string;
  countries: Countries[];
  languages: Languages[];
  doctorSpecialty?: DoctorSpecialtyList[];
  image?: string;
  isAdmin: boolean;
  dob?: string | Date;
  gender?: "Male" | "Female";
  token?: string;
  userSettingsId?: string;
}

interface Credentials {
  email: string;
  password?: string;
  passkeyToken?: string; // JWT token from passkey verification
}

async function createSessionUser(
  user: any,
  isAdmin: boolean,
  accountType: AccountType,
  settings: any,
): Promise<SessionUser> {
  return {
    id: user.id,
    _id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    accountType,
    city: user.city || "",
    countries: (user.countries || []).filter((c: string): c is Countries =>
      Object.values(Countries).includes(c as Countries),
    ),
    languages: (user.languages || []).filter((l: string): l is Languages =>
      Object.values(Languages).includes(l as Languages),
    ),
    // Specialty lives on `users`, not `user_settings` — it's needed on every
    // session, so it can't come from the on-demand settings row (which
    // admin-created users don't always have).
    doctorSpecialty: (user.doctorSpecialty || []).filter(
      (s: string): s is DoctorSpecialtyList =>
        Object.values(DoctorSpecialtyList).includes(s as DoctorSpecialtyList),
    ),
    image: user.image,
    isAdmin: isAdmin,
    dob: user.dob,
    gender:
      user.gender === "Male" || user.gender === "Female"
        ? user.gender
        : undefined,
    token: undefined,
    userSettingsId: settings?.id,
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        passkeyToken: { label: "Passkey Token", type: "text" },
      },
      async authorize(
        credentials: Credentials | undefined,
      ): Promise<SessionUser | null> {
        if (!credentials) throw new Error("Missing credentials");
        const { email, password, passkeyToken } = credentials;
        const isDev = process.env.NODE_ENV !== "production";
        if (isDev) console.log("🔐 Attempting login for:", email);

        // Find user by email (case-insensitive)
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
          with: {
            admin: true,
            settings: true,
          },
        });

        if (!user) {
          if (isDev) console.log("❌ User not found:", email);
          throw new Error("That email does not exist in our database.");
        }

        if (!user.authorized) {
          if (isDev) console.log("❌ User not authorized:", email);
          throw new Error("Your account has not been approved yet.");
        }

        // Passkey authentication path
        if (passkeyToken) {
          try {
            if (isDev) console.log("🔑 Attempting passkey authentication");
            const decoded = jwt.verify(passkeyToken, JWT_SECRET) as {
              userId: string;
              email: string;
              credentialId: string;
              authMethod: string;
              iat: number;
            };

            // Verify token matches the user
            if (decoded.userId !== user.id || decoded.email.toLowerCase() !== email.toLowerCase()) {
              if (isDev) console.log("❌ Passkey token mismatch");
              throw new Error("Invalid passkey authentication");
            }

            // Verify token is not too old (5 minutes max)
            if (Date.now() / 1000 - decoded.iat > 300) {
              if (isDev) console.log("❌ Passkey token expired");
              throw new Error("Passkey token expired. Please try again.");
            }

            if (isDev) console.log("✅ Passkey authentication successful");
          } catch (tokenError: any) {
            if (isDev) console.log("❌ Passkey token verification failed:", tokenError.message);
            throw new Error("Invalid passkey authentication");
          }
        }
        // Password authentication path
        else if (password) {
          if (!user.password) {
            if (isDev) console.log("❌ User has no password:", email);
            throw new Error("Please reset your password.");
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            if (isDev) console.log("❌ Invalid password for:", email);
            throw new Error("Invalid password");
          }
        }
        // Neither password nor passkey token provided
        else {
          throw new Error("Password or passkey token required");
        }

        // 2FA enforcement for password-based logins
        // Passkey logins already satisfy 2FA (biometric + possession)
        // TOTP-verified logins come through as passkeyToken (same JWT format)
        if (password && FeatureFlags.REQUIRE_2FA_LOGIN && !FeatureFlags.SKIP_2FA_IN_DEV) {
          // Check if user has any 2FA methods configured
          const [passkeyCount] = await db
            .select({ count: drizzleCount() })
            .from(passkeyCredentials)
            .where(
              and(
                eq(passkeyCredentials.userId, user.id),
                eq(passkeyCredentials.isActive, true),
              ),
            );
          const [totpCount] = await db
            .select({ count: drizzleCount() })
            .from(totpCredentials)
            .where(
              and(
                eq(totpCredentials.userId, user.id),
                eq(totpCredentials.isActive, true),
                eq(totpCredentials.isVerified, true),
              ),
            );

          const hasPasskey = (passkeyCount?.count ?? 0) > 0;
          const hasTotp = (totpCount?.count ?? 0) > 0;
          const has2FA = hasPasskey || hasTotp;

          if (has2FA) {
            // User has 2FA configured — require verification
            const methods: string[] = [];
            if (hasTotp) methods.push("totp");
            if (hasPasskey) methods.push("passkey");

            const loginToken = jwt.sign(
              {
                userId: user.id,
                email: user.email,
                purpose: "2fa_login",
              },
              JWT_SECRET,
              { expiresIn: "5m" },
            );

            throw new Error(
              `2FA_REQUIRED:${loginToken}:${methods.join(",")}`,
            );
          } else if (FeatureFlags.REQUIRE_2FA_LOGIN) {
            // No 2FA configured but it's required — handle grace period
            if (!user.twoFactorStatus) {
              // First time: set grace period
              const graceDeadline = new Date();
              graceDeadline.setDate(
                graceDeadline.getDate() + FeatureFlags.TWO_FA_GRACE_PERIOD_DAYS,
              );
              await db
                .update(users)
                .set({
                  twoFactorStatus: "setup_pending",
                  twoFactorGraceDeadline: graceDeadline,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));
              // Allow login during grace period — handled below
            } else if (
              user.twoFactorStatus === "setup_pending" &&
              user.twoFactorGraceDeadline &&
              new Date() > user.twoFactorGraceDeadline
            ) {
              // Grace period expired — block login
              throw new Error("2FA_SETUP_REQUIRED");
            }
            // During grace period: allow login (needs2FASetup will be set in session)
          }
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLogin: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id));

        if (isDev) console.log("✅ Login successful for:", email);

        const isAdmin = !!user.admin;

        const accountType: AccountType =
          user.accountType === "Doctor" ||
          user.accountType === "Triage" ||
          user.accountType === "Evac"
            ? user.accountType
            : "Triage"; // Fallback value

        return await createSessionUser(
          user,
          isAdmin,
          accountType,
          user.settings,
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      const extendedToken = token as unknown as ExtendedJWT;

      if (trigger === "update" && session?.user?.doctorSpecialty) {
        extendedToken.doctorSpecialty = (
          session.user.doctorSpecialty as string[]
        ).filter((specialty) =>
          Object.values(DoctorSpecialtyList).includes(
            specialty as DoctorSpecialtyList,
          ),
        ) as DoctorSpecialtyList[];
      }

      if (trigger === "update" && session?.user?.languages) {
        extendedToken.languages = (session.user.languages as string[]).filter(
          (lang): lang is Languages =>
            Object.values(Languages).includes(lang as Languages),
        );
      }

      if (trigger === "update" && session?.user?.countries) {
        extendedToken.countries = (session.user.countries as string[]).filter(
          (country): country is Countries =>
            Object.values(Countries).includes(country as Countries),
        );
      }

      if (user) {
        const sessionUser = user as SessionUser;
        extendedToken.id = sessionUser.id;
        extendedToken.email = sessionUser.email;
        extendedToken.accountType = sessionUser.accountType;
        extendedToken.firstName = sessionUser.firstName;
        extendedToken.lastName = sessionUser.lastName;
        extendedToken.city = sessionUser.city;
        extendedToken.countries = sessionUser.countries;
        extendedToken.languages = sessionUser.languages;
        extendedToken.isAdmin = sessionUser.isAdmin;
        extendedToken.image = sessionUser.image;
        extendedToken.dob = sessionUser.dob;
        extendedToken.doctorSpecialty = sessionUser.doctorSpecialty || [];
        extendedToken.gender = sessionUser.gender;
        extendedToken.userSettingsId = sessionUser.userSettingsId;
        extendedToken.accessToken = jwt.sign(
          {
            id: sessionUser.id,
            email: sessionUser.email,
            isAdmin: sessionUser.isAdmin,
          },
          process.env.NEXTAUTH_SECRET!,
          {
            expiresIn: JWT_CONFIG.AUTH_TOKEN_EXPIRY,
            header: {
              kid: JWT_CONFIG.KID,
              alg: JWT_CONFIG.ALG,
            },
          },
        );

        if (isDev) {
          console.log("🔑 JWT callback - Setting user ID:", sessionUser.id);
          console.log(
            "🔑 JWT callback - Setting user email:",
            sessionUser.email,
          );
        }
      }

      // Ensure id is always present
      if (!extendedToken.id && extendedToken.sub) {
        extendedToken.id = extendedToken.sub;
      }

      // Healing: If storageImage is missing but we have a user ID, fetch from DB
      // This fixes existing sessions where image URL has expired and original path was lost
      if (!extendedToken.storageImage && extendedToken.sub) {
        try {
          const needsHealing =
            !extendedToken.image ||
            extendedToken.image.startsWith("http") ||
            extendedToken.image.startsWith("https");

          if (needsHealing) {
            const dbUser = await db.query.users.findFirst({
              where: eq(users.id, extendedToken.sub),
            });

            if (
              dbUser?.image &&
              !dbUser.image.startsWith("http") &&
              !dbUser.image.startsWith("https")
            ) {
              extendedToken.storageImage = dbUser.image;
            }
          }
        } catch (error) {
          console.error("Error healing user image path:", error);
        }
      }

      // Always regenerate signed URL if we have a storage path
      if (extendedToken.storageImage) {
        try {
          const signedUrl = await storageService.getSignedUrl(
            extendedToken.storageImage,
            86400, // 24 hours
          );
          extendedToken.image = signedUrl;
        } catch (error) {
          console.error("Failed to sign profile image URL:", error);
        }
      } else if (
        extendedToken.image &&
        !extendedToken.image.startsWith("http") &&
        !extendedToken.image.startsWith("https")
      ) {
        try {
          const originalPath = extendedToken.image;
          const signedUrl = await storageService.getSignedUrl(
            originalPath,
            86400,
          );
          extendedToken.image = signedUrl;
          extendedToken.storageImage = originalPath;
        } catch (error) {
          console.error("Failed to sign profile image URL:", error);
        }
      }

      if (trigger === "update" && session?.user?.accountType) {
        if (isDev) {
          console.log(
            "Update triggered. New account type:",
            session.user.accountType,
          );
        }
        extendedToken.accountType = session.user.accountType as AccountType;
      }

      return extendedToken as unknown as JWT;
    },
    async session({ session, token }) {
      const extendedToken = token as unknown as ExtendedJWT;
      if (extendedToken && session.user) {
        (session.user as SessionUser) = {
          ...session.user,
          id: extendedToken.id!,
          _id: extendedToken.id!,
          email: extendedToken.email || session.user.email || "",
          accountType: extendedToken.accountType as AccountType,
          firstName: extendedToken.firstName!,
          lastName: extendedToken.lastName!,
          city: extendedToken.city || "",
          countries: extendedToken.countries || [],
          languages: extendedToken.languages || [],
          isAdmin: !!extendedToken.isAdmin,
          doctorSpecialty: extendedToken.doctorSpecialty || [],
          image: extendedToken.image,
          dob: extendedToken.dob,
          gender: extendedToken.gender,
          token: extendedToken.accessToken,
          userSettingsId: extendedToken.userSettingsId,
        };
      }

      return session;
    },
    async signIn({ account, profile }): Promise<boolean | string> {
      if (process.env.NODE_ENV !== "production") {
        console.log("--- SignIn Callback ---");
        console.log("Account:", account?.provider);
        console.log("Profile email:", profile?.email);
      }

      return true; // Allow sign in for other providers
    },
  },

  pages: {
    signIn: "/auth/login",
  },
};
