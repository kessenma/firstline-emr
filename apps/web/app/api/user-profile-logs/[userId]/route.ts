// app/api/user-profile-logs/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userProfileLogs, users } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;

  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user can access these logs (own logs or admin)
  const isOwner = session.userId === userId;
  const isAdmin = session.isAdmin === true;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(userProfileLogs)
      .where(eq(userProfileLogs.userId, userId));

    const total = totalResult[0]?.count || 0;

    // Get paginated logs with user information
    const logs = await db
      .select({
        id: userProfileLogs.id,
        userId: userProfileLogs.userId,
        changedBy: userProfileLogs.changedBy,
        changedAt: userProfileLogs.changedAt,
        changes: userProfileLogs.changes,
        isAdminAction: userProfileLogs.isAdminAction,
        createdAt: userProfileLogs.createdAt,
        // Include user info for changedBy
        changedByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(userProfileLogs)
      .leftJoin(users, eq(userProfileLogs.changedBy, users.id))
      .where(eq(userProfileLogs.userId, userId))
      .orderBy(desc(userProfileLogs.changedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user profile logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile logs" },
      { status: 500 }
    );
  }
}
