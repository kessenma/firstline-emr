// apps/web/app/api/admin/GET/backups/[id]/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups, backupRestores, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Fetch backup with creator info
    const results = await db
      .select({
        id: backups.id,
        createdBy: backups.createdBy,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByEmail: users.email,
        fileName: backups.fileName,
        filePath: backups.filePath,
        fileSize: backups.fileSize,
        status: backups.status,
        backupMode: backups.backupMode,
        tables: backups.tables,
        totalRecords: backups.totalRecords,
        checksum: backups.checksum,
        deviceInfo: backups.deviceInfo,
        encrypted: backups.encrypted,
        errorMessage: backups.errorMessage,
        createdAt: backups.createdAt,
        updatedAt: backups.updatedAt,
        expiresAt: backups.expiresAt,
      })
      .from(backups)
      .leftJoin(users, eq(backups.createdBy, users.id))
      .where(eq(backups.id, id))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json(
        { message: "Backup not found" },
        { status: 404 },
      );
    }

    const backup = results[0];

    // Generate a signed download URL
    let downloadUrl: string | null = null;
    if (backup.status === "available" && backup.filePath) {
      try {
        downloadUrl = await storageService.getSignedUrl(backup.filePath);
      } catch {
        // S3 error — don't fail the whole request
        console.error("Failed to generate signed URL for backup:", id);
      }
    }

    // Fetch restore history for this backup
    const restoreHistory = await db
      .select({
        id: backupRestores.id,
        restoredBy: backupRestores.restoredBy,
        restoredByFirstName: users.firstName,
        restoredByLastName: users.lastName,
        status: backupRestores.status,
        conflictStrategy: backupRestores.conflictStrategy,
        tablesRestored: backupRestores.tablesRestored,
        totalInserted: backupRestores.totalInserted,
        totalUpdated: backupRestores.totalUpdated,
        totalSkipped: backupRestores.totalSkipped,
        totalFailed: backupRestores.totalFailed,
        startedAt: backupRestores.startedAt,
        completedAt: backupRestores.completedAt,
        createdAt: backupRestores.createdAt,
      })
      .from(backupRestores)
      .leftJoin(users, eq(backupRestores.restoredBy, users.id))
      .where(eq(backupRestores.backupId, id))
      .orderBy(desc(backupRestores.createdAt));

    return NextResponse.json({
      backup: {
        ...backup,
        createdByName: [backup.createdByFirstName, backup.createdByLastName]
          .filter(Boolean)
          .join(" "),
        downloadUrl,
      },
      restoreHistory: restoreHistory.map((r) => ({
        ...r,
        restoredByName: [r.restoredByFirstName, r.restoredByLastName]
          .filter(Boolean)
          .join(" "),
      })),
    });
  } catch (error) {
    console.error("Get backup detail error:", error);
    return NextResponse.json(
      { message: "Failed to fetch backup details" },
      { status: 500 },
    );
  }
}
