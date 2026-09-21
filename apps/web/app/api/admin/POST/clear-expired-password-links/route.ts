// app/api/admin/POST/clear-expired-password-links/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { lt } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Clear expired password reset links
    // Find all users where adminResetLinkExpiry is less than now
    const result = await db
      .update(users)
      .set({
        adminResetPasswordLink: null,
        adminResetLinkExpiry: null,
        updatedAt: new Date(),
      })
      .where(lt(users.adminResetLinkExpiry, new Date()))
      .returning({ id: users.id });

    return NextResponse.json({
      message: "Expired links cleared",
      modifiedCount: result.length,
    });
  } catch (error) {
    console.error("Error clearing expired password links:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Failed to clear expired links: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Unknown error occurred while clearing expired links" },
      { status: 500 },
    );
  }
}
