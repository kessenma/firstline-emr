// apps/web/app/api/user-profile-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userProfileLogs, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  const session = await verifySessionFromRequest(request);

  if (!session || !session.userId || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    let userId = url.searchParams.get("userId") || undefined;

    // Support path segment `/api/user-profile-logs/:id`
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!userId && last && last !== "user-profile-logs") {
      userId = last;
    }

    const limit = Number.parseInt(url.searchParams.get("limit") || "50");
    const page = Number.parseInt(url.searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    // Build base query
    const whereClause = userId ? eq(userProfileLogs.userId, userId) : undefined;

    // Fetch logs with user info via join
    const rows = await db
      .select({
        id: userProfileLogs.id,
        userId: userProfileLogs.userId,
        changedBy: userProfileLogs.changedBy,
        changedAt: userProfileLogs.changedAt,
        changes: userProfileLogs.changes,
        isAdminAction: userProfileLogs.isAdminAction,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(userProfileLogs)
      .leftJoin(users, eq(users.id, userProfileLogs.userId))
      .where(whereClause as any)
      .orderBy(desc(userProfileLogs.changedAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userProfileLogs)
      .where(whereClause as any);

    const enhancedLogs = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      changedBy: r.changedBy,
      changedAt: r.changedAt,
      changes: r.changes,
      isAdminAction: r.isAdminAction,
      userEmail: r.userEmail,
      userName: `${r.userFirstName ?? ""} ${r.userLastName ?? ""}`.trim(),
    }));

    return NextResponse.json({
      logs: enhancedLogs,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user profile logs:", error);
    return NextResponse.json(
      { error: `Error fetching logs: ${error}` },
      { status: 500 },
    );
  }
}
