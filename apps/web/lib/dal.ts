// apps/web/lib/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { redirect } from "next/navigation";

/**
 * User session information
 */
export interface UserSession {
  isAuth: true;
  userId: string;
  email: string;
  accountType?: string;
  isAdmin?: boolean;
  doctorSpecialty?: string[];
  firstName?: string;
  lastName?: string;
  city?: string;
}

/**
 * Verify the user's session - works for both web (NextAuth) and mobile (JWT) clients
 * This is the primary function to use for authentication checks in Server Components,
 * Server Actions, and Route Handlers.
 *
 * Uses React's cache() to memoize the result during a render pass.
 *
 * @param options - Configuration options
 * @param options.redirectTo - Where to redirect if not authenticated (default: /auth/login)
 * @param options.noRedirect - If true, returns null instead of redirecting
 * @returns UserSession object or null (if noRedirect is true)
 */
export const verifySession = cache(
  async (options?: {
    redirectTo?: string;
    noRedirect?: boolean;
  }): Promise<UserSession | null> => {
    // Try NextAuth session first (web clients)
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      return {
        isAuth: true,
        userId: session.user.id,
        email: session.user.email || "",
        accountType: session.user.accountType,
        isAdmin: session.user.isAdmin,
        doctorSpecialty: session.user.doctorSpecialty,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        city: session.user.city,
      };
    }

    // Try JWT token (mobile clients)
    // We need to construct a mock request object with headers
    const cookieStore = await cookies();
    const authHeader = cookieStore.get("authorization")?.value;

    // Note: In Route Handlers and Server Actions, we'll need to pass the request
    // For Server Components, we rely on NextAuth session only
    if (!authHeader) {
      if (options?.noRedirect) {
        return null;
      }

      const redirectPath = options?.redirectTo || "/auth/login";
      redirect(redirectPath);
    }

    // This path is less common since mobile clients typically hit API routes
    // which have direct access to the request object
    if (options?.noRedirect) {
      return null;
    }

    const redirectPath = options?.redirectTo || "/auth/login";
    redirect(redirectPath);
  },
);

/**
 * Verify session from a request object (for API routes and Server Actions)
 * This version has access to the full request including Authorization headers
 *
 * @param request - The Next.js request object
 * @param options - Configuration options
 * @returns UserSession object or null
 */
export async function verifySessionFromRequest(
  request: Request,
  options?: { noRedirect?: boolean },
): Promise<UserSession | null> {
  // Try NextAuth session first (web clients)
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return {
      isAuth: true,
      userId: session.user.id,
      email: session.user.email || "",
      accountType: session.user.accountType,
      isAdmin: session.user.isAdmin,
      doctorSpecialty: session.user.doctorSpecialty,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      city: session.user.city,
    };
  }

  // Try JWT token from Authorization header (mobile clients)
  const authHeader = request.headers.get("authorization");

  console.log("🔍 [DAL] Checking JWT token...");
  console.log("  - Authorization header present:", !!authHeader);

  if (!authHeader) {
    console.log("  - No authorization header found");
    return null;
  }

  // Extract and verify JWT token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  console.log("  - Token extracted, length:", token.length);

  try {
    const jwt = require("jsonwebtoken");
    const JWT_SECRET =
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

    if (!JWT_SECRET) {
      console.error("❌ [DAL] JWT_SECRET not configured");
      return null;
    }

    console.log("  - JWT_SECRET configured, length:", JWT_SECRET.length);

    // JWT_SECRET is not base64-encoded
    console.log("  - Verifying JWT token...");
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    console.log("  - JWT verified successfully!");
    console.log("  - decoded.id:", decoded.id);
    console.log("  - decoded.sub:", decoded.sub);
    console.log("  - decoded.user_id:", decoded.user_id);
    console.log("  - decoded.email:", decoded.email);
    console.log("  - decoded.isAdmin:", decoded.isAdmin);

    // Get userId from the 'id' field (from mobile-auth/login)
    // Note: PowerSync tokens use 'sub' but should NOT be used for API auth
    const userId = decoded.id;

    // Validate that userId exists
    if (!userId) {
      console.error("❌ [DAL] JWT token missing 'id' field - user needs to re-login with auth token");
      return null;
    }

    const session: UserSession = {
      isAuth: true,
      userId: userId,
      email: decoded.email,
      accountType: decoded.accountType,
      isAdmin: decoded.isAdmin,
      doctorSpecialty: decoded.doctorSpecialty,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    console.log("  - Returning session with userId:", session.userId);

    return session;
  } catch (error) {
    console.error(
      "❌ [DAL] JWT verification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

/**
 * Require admin access - throws/redirects if user is not an admin
 *
 * @param session - Optional pre-verified session
 * @param options - Configuration options
 * @returns UserSession with isAdmin: true
 */
export async function requireAdmin(
  session?: UserSession | null,
  options?: { redirectTo?: string; noRedirect?: boolean },
): Promise<UserSession> {
  const userSession = session || (await verifySession({ noRedirect: true }));

  if (!userSession || !userSession.isAdmin) {
    console.log(
      "❌ [DAL] Admin access denied for:",
      userSession?.email || "unknown user",
    );

    if (options?.noRedirect) {
      throw new Error("Unauthorized: Admin access required");
    }

    const redirectPath = options?.redirectTo || "/";
    redirect(redirectPath);
  }

  return userSession;
}

/**
 * Check if user has a specific role or account type
 *
 * @param session - User session
 * @param allowedTypes - Array of allowed account types
 * @returns boolean
 */
export function hasAccountType(
  session: UserSession | null,
  allowedTypes: string[],
): boolean {
  if (!session || !session.accountType) {
    return false;
  }

  return allowedTypes.includes(session.accountType);
}

/**
 * Verify session and check account type in one call
 *
 * @param allowedTypes - Array of allowed account types
 * @param options - Configuration options
 * @returns UserSession with verified account type
 */
export async function requireAccountType(
  allowedTypes: string[],
  options?: { redirectTo?: string; noRedirect?: boolean },
): Promise<UserSession> {
  const session = await verifySession({ noRedirect: true });

  if (!session || !hasAccountType(session, allowedTypes)) {
    console.log(
      "❌ [DAL] Account type access denied. Required:",
      allowedTypes,
      "User has:",
      session?.accountType || "none",
    );

    if (options?.noRedirect) {
      throw new Error(
        `Unauthorized: Required account type: ${allowedTypes.join(", ")}`,
      );
    }

    const redirectPath = options?.redirectTo || "/";
    redirect(redirectPath);
  }

  return session;
}
