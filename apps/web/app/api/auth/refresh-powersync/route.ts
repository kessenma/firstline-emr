// app/api/auth/refresh-powersync/route.ts

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "@/lib/jwt-config";

// JWT_SECRET is not base64-encoded
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(
        "❌ [PowerSync Refresh] Missing or invalid Authorization header",
      );
      return NextResponse.json(
        { success: false, error: "Missing authorization token" },
        { status: 401 },
      );
    }

    const authToken = authHeader.replace("Bearer ", "");

    console.log("🔄 [PowerSync Refresh] Token refresh requested");

    // Verify the auth token
    let decoded: any;
    try {
      decoded = jwt.verify(authToken, JWT_SECRET);
      console.log(
        "✅ [PowerSync Refresh] Auth token verified for user:",
        decoded.email,
      );
    } catch (error) {
      console.log(
        "❌ [PowerSync Refresh] Invalid or expired auth token:",
        error,
      );
      return NextResponse.json(
        { success: false, error: "Invalid or expired authentication token" },
        { status: 401 },
      );
    }

    // Generate new PowerSync token (24 hours)
    // This token includes all required claims: sub, aud, iss, and custom kid header
    const powerSyncToken = jwt.sign(
      {
        sub: decoded.id, // User ID as subject
        aud: JWT_CONFIG.AUDIENCE, // PowerSync audience
        user_id: decoded.id,
        email: decoded.email,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_CONFIG.POWERSYNC_TOKEN_EXPIRY,
        issuer: JWT_CONFIG.ISSUER, // PowerSync requires 'iss' claim
        header: {
          kid: JWT_CONFIG.KID,
          alg: JWT_CONFIG.ALG,
        },
      },
    );

    console.log(
      "✅ [PowerSync Refresh] New PowerSync token generated for:",
      decoded.email,
    );

    return NextResponse.json({
      success: true,
      powerSyncToken,
    });
  } catch (error) {
    console.error("❌ [PowerSync Refresh] Error during token refresh:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred during token refresh",
      },
      { status: 500 },
    );
  }
}
