// app/api/admin-signup/pending-users/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    // Find all admin-created users who haven't confirmed their accounts
    const pendingUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
        doctorSpecialty: users.doctorSpecialty,
        emailSentDate: users.emailSentDate,
        confirmationTokenExpiry: users.confirmationTokenExpiry,
        adminCreatedBy: users.adminCreatedBy,
        adminCreatedDate: users.adminCreatedDate,
      })
      .from(users)
      .where(
        and(eq(users.isAdminCreated, true), eq(users.accountConfirmed, false)),
      )
      .orderBy(desc(users.emailSentDate));

    return NextResponse.json({
      success: true,
      pendingUsers,
    });
  } catch (error) {
    console.error("Fetch pending users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
