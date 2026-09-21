// apps/web/app/api/admin/POST/backups/upload-encrypted/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { decryptBackup } from "@/lib/backup/encryptionService";
import {
  CLINICAL_BACKUP_TABLES,
  FULL_MIGRATION_TABLES,
  type BackupTableManifest,
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
    const passphrase = formData.get("passphrase") as string | null;

    if (!file || !passphrase) {
      return NextResponse.json(
        { message: "Missing required fields: file, passphrase" },
        { status: 400 },
      );
    }

    if (passphrase.length < BACKUP_MIN_PASSPHRASE_LENGTH) {
      return NextResponse.json(
        { message: `Passphrase must be at least ${BACKUP_MIN_PASSPHRASE_LENGTH} characters` },
        { status: 400 },
      );
    }

    // Read encrypted file
    const encryptedBuffer = Buffer.from(await file.arrayBuffer());

    // Decrypt
    let jsonBuffer: Buffer;
    try {
      jsonBuffer = decryptBackup(encryptedBuffer, passphrase);
    } catch (err: any) {
      return NextResponse.json(
        { message: err.message || "Decryption failed" },
        { status: 400 },
      );
    }

    // Validate JSON structure
    let parsedBackup: any;
    try {
      parsedBackup = JSON.parse(jsonBuffer.toString("utf-8"));
    } catch {
      return NextResponse.json(
        { message: "Decrypted content is not valid JSON" },
        { status: 400 },
      );
    }

    if (!parsedBackup.version || !parsedBackup.tables) {
      return NextResponse.json(
        { message: "Invalid backup format: missing version or tables" },
        { status: 400 },
      );
    }

    // Extract manifest from the backup JSON
    const backupMode: BackupMode = parsedBackup.backupMode || "clinical";
    const allowedTables =
      backupMode === "full_migration"
        ? (FULL_MIGRATION_TABLES as readonly string[])
        : (CLINICAL_BACKUP_TABLES as readonly string[]);

    const tables: BackupTableManifest[] = Object.entries(
      parsedBackup.tables as Record<string, { columns: string[]; records: any[] }>,
    )
      .filter(([tableName]) => allowedTables.includes(tableName))
      .map(([tableName, data]) => ({
        tableName,
        recordCount: data.records?.length || 0,
        columns: data.columns || [],
      }));

    const totalRecords = tables.reduce((sum, t) => sum + t.recordCount, 0);

    // Compute checksum of the decrypted JSON
    const checksum = crypto
      .createHash("sha256")
      .update(jsonBuffer)
      .digest("hex");

    // Upload decrypted JSON to S3 (stored unencrypted in S3, encryption is for transit)
    const uploadResult = await storageService.upload({
      file: jsonBuffer,
      fileName: `backup-${Date.now()}.json`,
      contentType: "application/json",
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
        tables,
        totalRecords,
        checksum,
        deviceInfo: parsedBackup.deviceInfo,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
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
          tables,
          createdAt: backup.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Encrypted backup upload error:", error);
    return NextResponse.json(
      { message: "Failed to upload encrypted backup" },
      { status: 500 },
    );
  }
}
