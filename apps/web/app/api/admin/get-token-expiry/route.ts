// app/api/admin/get-token-expiry/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Support both web sessions and mobile JWT tokens
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Find the user by email
    const [targetUser] = await db
      .select({
        verificationCodeExpiry: users.verificationCodeExpiry,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Return the verification code expiry date
    return NextResponse.json({
      success: true,
      expiryDate: targetUser.verificationCodeExpiry || null,
    });
  } catch (error) {
    console.error("Error getting token expiry:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get token expiry" },
      { status: 500 },
    );
  }
}
