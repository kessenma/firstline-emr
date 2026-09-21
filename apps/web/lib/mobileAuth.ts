// apps/web/lib/mobileAuth.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

// Log SECRET availability on module load (only show length for security)
if (SECRET) {
  console.log("🔐 [MobileAuth] JWT_SECRET is set (length:", SECRET.length, ")");
} else {
  console.error("❌ [MobileAuth] WARNING: JWT_SECRET is not set!");
}

interface JwtPayload {
  id: string;
  email: string;
  isAdmin?: boolean;
  accountType?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verifies JWT token from Authorization header for mobile clients
 * @param request NextRequest object
 * @returns Decoded JWT payload or null if invalid
 */
export function verifyMobileToken(request: NextRequest): JwtPayload | null {
  try {
    console.log("🔐 [MobileAuth] Verifying mobile token...");
    const authHeader = request.headers.get("authorization");
    console.log("🔐 [MobileAuth] Authorization header present:", !!authHeader);

    if (authHeader) {
      console.log(
        "🔐 [MobileAuth] Authorization header value (first 20 chars):",
        authHeader.substring(0, 20) + "...",
      );
    }

    if (!authHeader) {
      console.log("🔐 [MobileAuth] No authorization header found");
      return null;
    }

    // Support both "Bearer TOKEN" and just "TOKEN" formats
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      console.log("🔐 [MobileAuth] Token is empty after extraction");
      return null;
    }

    console.log("🔐 [MobileAuth] Token length:", token.length);
    console.log(
      "🔐 [MobileAuth] Token preview:",
      token.substring(0, 20) + "..." + token.substring(token.length - 10),
    );
    console.log("🔐 [MobileAuth] JWT_SECRET available:", !!SECRET);
    console.log("🔐 [MobileAuth] JWT_SECRET length:", SECRET.length);

    if (!SECRET) {
      console.error(
        "❌ [MobileAuth] Cannot verify token: JWT_SECRET is not set!",
      );
      return null;
    }

    console.log("🔐 [MobileAuth] Attempting jwt.verify...");
    const decoded = jwt.verify(token, SECRET) as JwtPayload;
    console.log("🔐 [MobileAuth] Token decoded successfully");
    console.log("🔐 [MobileAuth] Decoded user ID:", decoded.id);
    console.log("🔐 [MobileAuth] Decoded user email:", decoded.email);

    if (!decoded || !decoded.id) {
      console.error("❌ [MobileAuth] Invalid token payload: missing id");
      return null;
    }

    console.log("✅ [MobileAuth] Token verification successful");
    return decoded;
  } catch (error) {
    console.error("❌ [MobileAuth] Error verifying mobile token:", error);
    if (error instanceof Error) {
      console.error("❌ [MobileAuth] Error message:", error.message);
      console.error("❌ [MobileAuth] Error name:", error.name);
      console.error("❌ [MobileAuth] Error stack:", error.stack);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("❌ [MobileAuth] JWT Error type:", error.constructor.name);
    }
    if (error instanceof jwt.TokenExpiredError) {
      console.error("❌ [MobileAuth] Token expired at:", error.expiredAt);
    }
    return null;
  }
}

/**
 * Extracts user ID from either NextAuth session or JWT token
 * This allows the same API route to support both web and mobile clients
 * @param request NextRequest object
 * @param session NextAuth session object (optional)
 * @returns User ID or null
 */
export function getUserIdFromRequest(
  request: NextRequest,
  session?: { user?: { id?: string } } | null,
): string | null {
  console.log("🔍 [MobileAuth] getUserIdFromRequest called");

  // First, try to get from NextAuth session (web clients)
  if (session?.user?.id) {
    console.log("✅ [MobileAuth] Found user ID from session:", session.user.id);
    return session.user.id;
  }

  console.log("🔄 [MobileAuth] No session, checking JWT token...");
  // Fallback to JWT token (mobile clients)
  const decoded = verifyMobileToken(request);
  if (decoded?.id) {
    console.log("✅ [MobileAuth] Found user ID from JWT:", decoded.id);
    return decoded.id;
  }

  console.log("❌ [MobileAuth] No user ID found from either source");
  return null;
}

/**
 * Extracts full user info from either NextAuth session or JWT token
 * @param request NextRequest object
 * @param session NextAuth session object (optional)
 * @returns User info or null
 */
export function getUserFromRequest(
  request: NextRequest,
  session?: {
    user?: {
      id?: string;
      email?: string;
      accountType?: string;
      isAdmin?: boolean;
      doctorSpecialty?: string[];
      firstName?: string;
      lastName?: string;
      city?: string;
    };
  } | null,
): {
  id: string;
  email: string;
  accountType?: string;
  isAdmin?: boolean;
  doctorSpecialty?: string[];
  firstName?: string;
  lastName?: string;
  city?: string;
} | null {
  console.log("👤 [MobileAuth] Getting user from request...");
  console.log("👤 [MobileAuth] Session present:", !!session);
  console.log("👤 [MobileAuth] Session has user:", !!session?.user);

  // First, try to get from NextAuth session (web clients)
  if (session?.user?.id) {
    console.log(
      "✅ [MobileAuth] Using NextAuth session for user:",
      session.user.email,
    );
    return {
      id: session.user.id,
      email: session.user.email || "",
      accountType: session.user.accountType,
      isAdmin: session.user.isAdmin,
      doctorSpecialty: session.user.doctorSpecialty,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      city: session.user.city,
    };
  }

  console.log("🔄 [MobileAuth] No session, trying JWT token...");
  // Fallback to JWT token (mobile clients)
  const decoded = verifyMobileToken(request);
  if (!decoded) {
    console.log("❌ [MobileAuth] No valid JWT token found");
    return null;
  }

  console.log("✅ [MobileAuth] Using JWT token for user:", decoded.email);
  return {
    id: decoded.id,
    email: decoded.email,
    accountType: decoded.accountType,
    isAdmin: decoded.isAdmin,
  };
}
