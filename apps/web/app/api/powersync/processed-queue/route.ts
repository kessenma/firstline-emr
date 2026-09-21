// apps/web/app/api/powersync/processed-queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { userProfileLogs, users } from "@/db/schema";
import { desc, eq, sql, and, or } from "drizzle-orm";

/**
 * GET /api/powersync/processed-queue
 *
 * Returns successfully synced PowerSync updates from all tables.
 * This shows the audit trail of changes that have been processed.
 *
 * Query params:
 * - table: Filter by table name (optional)
 * - operation: Filter by operation type (create/update/delete) (optional)
 * - limit: Number of items to return (default: 20)
 * - offset: Number of items to skip (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const session = await verifySessionFromRequest(request);

    if (!session || !session.userId || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const tableFilter = url.searchParams.get("table") || undefined;
    const operationFilter = url.searchParams.get("operation") || undefined;
    const limit = Number.parseInt(url.searchParams.get("limit") || "20");
    const offset = Number.parseInt(url.searchParams.get("offset") || "0");

    // Build query - get all profile logs (these represent synced changes)
    const logs = await db
      .select({
        id: userProfileLogs.id,
        userId: userProfileLogs.userId,
        changedBy: userProfileLogs.changedBy,
        changedAt: userProfileLogs.changedAt,
        changes: userProfileLogs.changes,
        createdAt: userProfileLogs.createdAt,
        isAdminAction: userProfileLogs.isAdminAction,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(userProfileLogs)
      .leftJoin(users, eq(users.id, userProfileLogs.userId))
      .orderBy(desc(userProfileLogs.changedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userProfileLogs);

    console.log(
      "[ProcessedQueue API] Found",
      logs.length,
      "logs (offset:",
      offset,
      ")",
    );

    // Debug: Log raw data from database
    if (logs.length > 0) {
      console.log("[ProcessedQueue API] First raw log from DB:", {
        id: logs[0].id,
        userId: logs[0].userId,
        changedBy: logs[0].changedBy,
        userEmail: logs[0].userEmail,
        userFirstName: logs[0].userFirstName,
        userLastName: logs[0].userLastName,
        changes: logs[0].changes,
        changedAt: logs[0].changedAt,
        createdAt: logs[0].createdAt,
      });
    }

    const formattedLogs = logs.map((log) => {
      // Detect source: mobile (offline) vs web (online)
      // Better detection logic:
      // 1. If user changed themselves (!isAdminAction) = likely mobile
      // 2. If time difference > 5 seconds = offline queue (mobile)
      // 3. Otherwise = web
      const createdAt = log.createdAt ? new Date(log.createdAt).getTime() : 0;
      const changedAt = log.changedAt ? new Date(log.changedAt).getTime() : 0;
      const timeDiff = Math.abs(changedAt - createdAt);

      // User changing themselves = mobile (account switcher)
      const isSelfChange = log.userId === log.changedBy;
      const hasTimeDelay = timeDiff > 5000;

      const source =
        (isSelfChange && !log.isAdminAction) || hasTimeDelay ? "mobile" : "web";

      // Debug each field
      console.log(`[ProcessedQueue API] Formatting log ${log.id}:`, {
        userId: log.userId,
        userEmail: log.userEmail,
        firstName: log.userFirstName,
        lastName: log.userLastName,
        changes: log.changes,
        source,
      });

      const formattedLog = {
        id: log.id,
        operation: "update" as const,
        tableName: "user_profile_logs",
        recordId: log.userId || log.id,
        userId: log.userId,
        userEmail: log.userEmail || undefined,
        userName:
          `${log.userFirstName || ""} ${log.userLastName || ""}`.trim() ||
          undefined,
        data: log.changes,
        syncedAt: log.changedAt?.toISOString() || new Date().toISOString(),
        source,
        duration: timeDiff,
      };

      return formattedLog;
    });

    console.log("[ProcessedQueue API] Formatted", formattedLogs.length, "logs");
    if (formattedLogs.length > 0) {
      console.log(
        "[ProcessedQueue API] Sample formatted item:",
        JSON.stringify(formattedLogs[0], null, 2),
      );
    }

    // Apply filters
    let filteredLogs = formattedLogs;

    if (tableFilter && tableFilter !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.tableName === tableFilter,
      );
    }

    if (operationFilter && operationFilter !== "all") {
      filteredLogs = filteredLogs.filter(
        (log) => log.operation === operationFilter,
      );
    }

    console.log("[ProcessedQueue API] Returning", filteredLogs.length, "items");

    // Debug: Log what we're about to send
    if (filteredLogs.length > 0) {
      console.log(
        "[ProcessedQueue API] First item being returned:",
        JSON.stringify(filteredLogs[0], null, 2),
      );
    }

    const response = {
      items: filteredLogs,
      count: filteredLogs.length,
      total: totalCount || 0,
      hasMore: offset + limit < (totalCount || 0),
    };

    console.log("[ProcessedQueue API] Response structure:", {
      itemsCount: response.items.length,
      count: response.count,
      total: response.total,
      hasMore: response.hasMore,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[ProcessedQueue API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch processed items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
