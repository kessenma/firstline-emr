// apps/web/app/api/admin/POST/backups/create-server/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { generateServerBackup } from "@/lib/backup/backupGenerator";
import { encryptBackup } from "@/lib/backup/encryptionService";
import { buildAuthBundle } from "@/lib/backup/authBundle";
import {
  CLINICAL_BACKUP_TABLES,
  FULL_MIGRATION_TABLES,
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

    const {
      backupMode,
      selectedTables: requestedTables,
      passphrase,
      includeAuth = false,
      embedMasterkey = false,
    } = (await request.json()) as {
      backupMode: BackupMode;
      selectedTables?: string[];
      passphrase?: string;
      includeAuth?: boolean;
      embedMasterkey?: boolean;
    };

    // Validate passphrase if provided
    const shouldEncrypt = !!passphrase;
    if (shouldEncrypt && passphrase.length < BACKUP_MIN_PASSPHRASE_LENGTH) {
      return NextResponse.json(
        { message: `Passphrase must be at least ${BACKUP_MIN_PASSPHRASE_LENGTH} characters` },
        { status: 400 },
      );
    }

    if (!backupMode || !["clinical", "full_migration"].includes(backupMode)) {
      return NextResponse.json(
        { message: "Invalid backup mode" },
        { status: 400 },
      );
    }

    // Auth bundle (passkeys/TOTP + Zitadel dump) is a full-migration-only concern
    // and MUST be encrypted — it carries credentials and possibly the masterkey.
    if (includeAuth) {
      if (backupMode !== "full_migration") {
        return NextResponse.json(
          { message: "Authentication can only be included in a full migration backup" },
          { status: 400 },
        );
      }
      if (!passphrase) {
        return NextResponse.json(
          { message: "A passphrase is required when including authentication data" },
          { status: 400 },
        );
      }
    }

    // Determine tables to backup
    const allowedTables: string[] =
      backupMode === "full_migration"
        ? [...FULL_MIGRATION_TABLES]
        : [...CLINICAL_BACKUP_TABLES];

    const selectedTables = requestedTables
      ? requestedTables.filter((t) => allowedTables.includes(t))
      : allowedTables;

    if (selectedTables.length === 0) {
      return NextResponse.json(
        { message: "No valid tables selected" },
        { status: 400 },
      );
    }

    // Generate backup from PostgreSQL
    const { buffer, manifest, totalRecords } = await generateServerBackup({
      selectedTables,
      backupMode,
    });

    // Compute checksum
    const checksum = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    // Build the encrypted auth bundle (app passkey/TOTP rows + Zitadel DB dump)
    // BEFORE uploading anything, so a pg_dump failure aborts with no artifacts.
    let authUpload: { filePath: string } | null = null;
    let authMeta: Awaited<ReturnType<typeof buildAuthBundle>>["meta"] | null =
      null;
    if (includeAuth) {
      const { envelope, meta } = await buildAuthBundle({ embedMasterkey });
      authMeta = meta;
      const encryptedAuth = encryptBackup(envelope, passphrase!);
      const authFileName = `server-auth-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.fajr-auth`;
      authUpload = await storageService.upload({
        file: encryptedAuth,
        fileName: authFileName,
        contentType: "application/octet-stream",
        basePath: `backups/server/${session.userId}`,
      });
    }

    // Optionally encrypt before uploading to S3
    const fileToUpload = shouldEncrypt
      ? encryptBackup(buffer, passphrase!)
      : buffer;
    const fileExtension = shouldEncrypt ? ".fajr-backup" : ".json";
    const contentType = shouldEncrypt
      ? "application/octet-stream"
      : "application/json";

    // Upload to S3
    const fileName = `server-backup-${new Date().toISOString().replace(/[:.]/g, "-")}${fileExtension}`;
    const uploadResult = await storageService.upload({
      file: fileToUpload,
      fileName,
      contentType,
      basePath: `backups/server/${session.userId}`,
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
        backupSource: "server",
        encrypted: shouldEncrypt,
        includesAuth: includeAuth,
        authDumpPath: authUpload?.filePath ?? null,
        authMeta: authMeta ?? null,
        tables: manifest,
        totalRecords,
        checksum,
        deviceInfo: { platform: "server", appVersion: "web" },
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
          backupSource: backup.backupSource,
          totalRecords: backup.totalRecords,
          tables: manifest,
          includesAuth: backup.includesAuth,
          authMeta: backup.authMeta,
          createdAt: backup.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Server backup creation error:", error);
    return NextResponse.json(
      { message: "Failed to create server backup" },
      { status: 500 },
    );
  }
}
