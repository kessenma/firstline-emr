// app/api/admin/POST/admin-mgmt-add/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins, users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 },
      );
    }

    // Check if user exists
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is already an admin
    const [existingAdmin] = await db
      .select()
      .from(admins)
      .where(eq(admins.userId, userId))
      .limit(1);

    if (existingAdmin) {
      return NextResponse.json(
        { message: "User is already an admin" },
        { status: 400 },
      );
    }

    // Create new admin record
    await db.insert(admins).values({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    return NextResponse.json(
      { message: "Admin added successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error adding admin:", error);
    return NextResponse.json(
      { message: "Failed to add admin" },
      { status: 500 },
    );
  }
}
