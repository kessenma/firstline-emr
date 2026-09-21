// app/api/admin/POST/re-approve-users/route.ts

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

    // Retrieve the userIds from the request body
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 },
      );
    }

    // Re-approve users: set authorized to true, clear denialDate, set approvalDate
    await db
      .update(users)
      .set({
        authorized: true,
        approvalDate: new Date(),
        denialDate: null,
        updatedAt: new Date(),
      })
      .where(inArray(users.id, userIds));

    return NextResponse.json(
      { message: "Users re-approved successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during user re-approval:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Error: ${error.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "An unknown error occurred" },
      { status: 500 },
    );
  }
}
