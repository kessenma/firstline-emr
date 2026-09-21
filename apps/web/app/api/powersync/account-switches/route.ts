// apps/web/app/api/powersync/account-switches/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { userProfileLogs } from "@/db/schema/userProfileLogs";
import { users } from "@/db/schema/users";
import { admins } from "@/db/schema/admins";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * GET /api/powersync/account-switches
 *
 * Fetches account switch audit logs for PowerSync monitoring dashboard.
 * Shows both online (web) and offline (mobile) account changes.
 *
 * Query params:
 * - limit: number of logs to return (default: 50, max: 200)
 *
 * Response:
 * {
 *   logs: AccountSwitchLog[]
 * }
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view account switch logs
    const adminUser = await db
      .select()
      .from(admins)
      .where(eq(admins.userId, session.user.id))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50"),
      200
    );

    // Fetch audit logs with user info
    const logs = await db
      .select({
        id: userProfileLogs.id,
        userId: userProfileLogs.userId,
        changedBy: userProfileLogs.changedBy,
        changedAt: userProfileLogs.changedAt,
        changes: userProfileLogs.changes,
        isAdminAction: userProfileLogs.isAdminAction,
        createdAt: userProfileLogs.createdAt,
        // User info
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        // Changed by user info (via subquery)
      })
      .from(userProfileLogs)
      .leftJoin(users, eq(userProfileLogs.userId, users.id))
      .where(
        sql`${userProfileLogs.changes}::text LIKE '%accountType%'`
      )
      .orderBy(desc(userProfileLogs.changedAt))
      .limit(limit);

    // Fetch changed-by user info separately
    const changedByIds = [...new Set(logs.map((log) => log.changedBy))];
    const changedByUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(
        sql`${users.id} IN (${sql.join(
          changedByIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    const changedByMap = new Map(
      changedByUsers.map((user) => [user.id, user])
    );

    // Format response
    const formattedLogs = logs.map((log) => {
      const changedByUser = changedByMap.get(log.changedBy);
      const userName = `${log.userFirstName || ""} ${log.userLastName || ""}`.trim() || "Unknown";

      // Detect if synced from mobile (offline)
      // If the log was created significantly after the change timestamp, it was likely queued offline
      const createdAt = new Date(log.createdAt).getTime();
      const changedAt = new Date(log.changedAt).getTime();
      const timeDiff = createdAt - changedAt;
      const syncedFromMobile = timeDiff > 60000; // More than 1 minute delay = offline sync

      return {
        id: log.id,
        userId: log.userId,
        userEmail: log.userEmail || "unknown@example.com",
        userName,
        changedBy: log.changedBy,
        changedByEmail: changedByUser?.email || "system@example.com",
        changedAt: log.changedAt.toISOString(),
        changes: Array.isArray(log.changes) ? log.changes : [],
        isAdminAction: Boolean(log.isAdminAction),
        syncedFromMobile,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      logs: formattedLogs,
      count: formattedLogs.length,
    });
  } catch (error) {
    console.error("[API] Error fetching account switch logs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch account switch logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
