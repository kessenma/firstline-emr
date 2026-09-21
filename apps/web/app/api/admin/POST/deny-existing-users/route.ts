// app/api/admin/POST/deny-existing-users/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { inArray } from "drizzle-orm";
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

    // Parse request body
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 },
      );
    }

    // Update users to denied status (authorized = false, set denialDate)
    await db
      .update(users)
      .set({
        authorized: false,
        denialDate: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds));

    return NextResponse.json(
      { message: "Users moved to denied status successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error denying existing users:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Authorization failed: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
