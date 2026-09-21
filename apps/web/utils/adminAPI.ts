import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { JwtPayload } from "jsonwebtoken";
import { verifyMobileToken } from "@/lib/mobileAuth";

/**
 * Verifies admin access from either NextAuth session or mobile JWT token
 * Supports both web (NextAuth) and mobile (JWT) authentication
 * @param req NextRequest object
 * @returns Decoded token payload if user is admin, null otherwise
 */
export async function verifyAdminToken(
  req: NextRequest,
): Promise<JwtPayload | null> {
  try {
    // First, try NextAuth session (web clients)
    const sessionToken = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (sessionToken && sessionToken.isAdmin) {
      return sessionToken as JwtPayload;
    }

    // Fallback to mobile JWT token
    const mobileToken = verifyMobileToken(req);
    if (mobileToken && mobileToken.isAdmin) {
      return mobileToken as unknown as JwtPayload;
    }

    // No valid admin token found
    return null;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
