// apps/web/app/api/admin/POST/backups/upload/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { encryptBackup } from "@/lib/backup/encryptionService";
import {
  CLINICAL_BACKUP_TABLES,
  FULL_MIGRATION_TABLES,
  type BackupTableManifest,
  type BackupDeviceInfo,
  type BackupMode,
} from "@fajr/shared/admin";
import { BACKUP_MIN_PASSPHRASE_LENGTH } from "@fajr/shared/backup";

export async function POST(request: Request) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const checksum = formData.get("checksum") as string | null;
    const tablesJson = formData.get("tables") as string | null;
    const totalRecords = formData.get("totalRecords") as string | null;
    const deviceInfoJson = formData.get("deviceInfo") as string | null;
    const backupMode = (formData.get("backupMode") as BackupMode) || "clinical";
    const passphrase = formData.get("passphrase") as string | null;

    // Validate passphrase if provided
    const shouldEncrypt = !!passphrase;
    if (shouldEncrypt && passphrase.length < BACKUP_MIN_PASSPHRASE_LENGTH) {
      return NextResponse.json(
        { message: `Passphrase must be at least ${BACKUP_MIN_PASSPHRASE_LENGTH} characters` },
        { status: 400 },
      );
    }

    if (!file || !tablesJson || !totalRecords) {
      return NextResponse.json(
        { message: "Missing required fields: file, tables, totalRecords" },
        { status: 400 },
      );
    }

    // Parse metadata
    const tables: BackupTableManifest[] = JSON.parse(tablesJson);
    const deviceInfo: BackupDeviceInfo | undefined = deviceInfoJson
      ? JSON.parse(deviceInfoJson)
      : undefined;

    // Validate table names against allowed lists
    const allowedTables =
      backupMode === "full_migration"
        ? (FULL_MIGRATION_TABLES as readonly string[])
        : (CLINICAL_BACKUP_TABLES as readonly string[]);

    const invalidTables = tables.filter(
      (t) => !allowedTables.includes(t.tableName),
    );
    if (invalidTables.length > 0) {
      return NextResponse.json(
        {
          message: `Invalid tables for ${backupMode} mode: ${invalidTables.map((t) => t.tableName).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Read file content and validate checksum
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (checksum) {
      const computedHash = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");
      if (computedHash !== checksum) {
        return NextResponse.json(
          { message: "Checksum mismatch — file may be corrupted" },
          { status: 400 },
        );
      }
    }

    // Validate JSON structure
    let parsedBackup: any;
    try {
      parsedBackup = JSON.parse(fileBuffer.toString("utf-8"));
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON in backup file" },
        { status: 400 },
      );
    }

    if (!parsedBackup.version || !parsedBackup.tables) {
      return NextResponse.json(
        { message: "Invalid backup format: missing version or tables" },
        { status: 400 },
      );
    }

    // Optionally encrypt before uploading to S3
    const fileToUpload = shouldEncrypt
      ? encryptBackup(fileBuffer, passphrase!)
      : fileBuffer;
    const uploadFileName = shouldEncrypt
      ? (file.name || `backup-${Date.now()}`).replace(/\.json$/i, "") + ".fajr-backup"
      : file.name || `backup-${Date.now()}.json`;
    const uploadContentType = shouldEncrypt
      ? "application/octet-stream"
      : "application/json";

    // Upload to S3
    const uploadResult = await storageService.upload({
      file: fileToUpload,
      fileName: uploadFileName,
      contentType: uploadContentType,
      basePath: `backups/admin/${session.userId}`,
    });

    // Create DB record
    const [backup] = await db
      .insert(backups)
      .values({
        createdBy: session.userId,
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        status: "available",
        backupMode,
        encrypted: shouldEncrypt,
        tables,
        totalRecords: parseInt(totalRecords, 10),
        checksum: checksum || null,
        deviceInfo,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        backup: {
          id: backup.id,
          fileName: backup.fileName,
          fileSize: backup.fileSize,
          status: backup.status,
          backupMode: backup.backupMode,
          totalRecords: backup.totalRecords,
          createdAt: backup.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Backup upload error:", error);
    return NextResponse.json(
      { message: "Failed to upload backup" },
      { status: 500 },
    );
  }
}
