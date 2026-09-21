// apps/web/app/api/admin/GET/backups/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { users } from "@/db/schema";
import { desc, eq, sql, and } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import type { BackupStatus, BackupMode } from "@fajr/shared/admin";

export async function GET(request: Request) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get("status") as BackupStatus | null;
    const modeFilter = searchParams.get("mode") as BackupMode | null;

    // Build conditions
    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(backups.status, statusFilter));
    }
    if (modeFilter) {
      conditions.push(eq(backups.backupMode, modeFilter));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(backups)
      .where(whereClause);

    // Fetch paginated with creator name
    const results = await db
      .select({
        id: backups.id,
        createdBy: backups.createdBy,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        fileName: backups.fileName,
        fileSize: backups.fileSize,
        status: backups.status,
        backupMode: backups.backupMode,
        backupSource: backups.backupSource,
        tables: backups.tables,
        totalRecords: backups.totalRecords,
        checksum: backups.checksum,
        encrypted: backups.encrypted,
        includesAuth: backups.includesAuth,
        authMeta: backups.authMeta,
        deviceInfo: backups.deviceInfo,
        createdAt: backups.createdAt,
        expiresAt: backups.expiresAt,
      })
      .from(backups)
      .leftJoin(users, eq(backups.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(backups.createdAt))
      .limit(limit)
      .offset(offset);

    const backupList = results.map((row) => ({
      id: row.id,
      createdBy: row.createdBy,
      createdByName: [row.createdByFirstName, row.createdByLastName]
        .filter(Boolean)
        .join(" "),
      fileName: row.fileName,
      fileSize: row.fileSize,
      status: row.status,
      backupMode: row.backupMode,
      backupSource: row.backupSource,
      tables: row.tables,
      totalRecords: row.totalRecords,
      checksum: row.checksum,
      encrypted: row.encrypted,
      includesAuth: row.includesAuth,
      authMeta: row.authMeta,
      deviceInfo: row.deviceInfo,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    }));

    const totalPages = Math.ceil(Number(count) / limit);

    return NextResponse.json({
      backups: backupList,
      totalPages,
      currentPage: page,
      totalCount: Number(count),
    });
  } catch (error) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { message: "Failed to fetch backups" },
      { status: 500 },
    );
  }
}
