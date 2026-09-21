// app/api/admin/POST/admin-mgmt-remove/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
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
    const { adminId } = await request.json();
    if (!adminId) {
      return NextResponse.json(
        { message: "Admin ID is required" },
        { status: 400 },
      );
    }

    // Check if admin exists
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminId))
      .limit(1);

    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    // Delete admin record (user record remains intact)
    await db.delete(admins).where(eq(admins.id, adminId));

    return NextResponse.json(
      { message: "Admin removed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error removing admin:", error);
    return NextResponse.json(
      { message: "Failed to remove admin" },
      { status: 500 },
    );
  }
}
