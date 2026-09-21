// apps/web/app/api/setup/upload-and-preview/route.ts
// Accepts an encrypted .fajr-backup file + passphrase, decrypts, validates,
// stores temporarily, and returns a preview of the backup contents.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";
import { decryptBackup } from "@/lib/backup/encryptionService";
import { storageService } from "@/lib/storage";
import { BACKUP_MIN_PASSPHRASE_LENGTH } from "@fajr/shared/backup";
import {
  CLINICAL_BACKUP_TABLES,
  FULL_MIGRATION_TABLES,
} from "@fajr/shared/admin";

export async function POST(request: Request) {
  try {
    // Guard: only works when DB has no users
    const [{ count: userCount }] = await db
      .select({ count: count() })
      .from(users);

    if (userCount > 0) {
      return NextResponse.json(
        { message: "Setup is only available on an empty database" },
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

    // Read and decrypt
    const encryptedBuffer = Buffer.from(await file.arrayBuffer());

    let jsonBuffer: Buffer;
    try {
      jsonBuffer = decryptBackup(encryptedBuffer, passphrase);
    } catch (err: any) {
      return NextResponse.json(
        { message: err.message || "Decryption failed — wrong passphrase?" },
        { status: 400 },
      );
    }

    // Parse JSON
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

    // Store the decrypted JSON temporarily in S3 with a setup token
    const setupToken = crypto.randomUUID();
    const tempPath = `setup-temp/${setupToken}.json`;

    await storageService.upload({
      file: jsonBuffer,
      fileName: `${setupToken}.json`,
      contentType: "application/json",
      basePath: "setup-temp",
    });

    // Build preview
    const backupMode = parsedBackup.backupMode || "clinical";
    const allowedTables =
      backupMode === "full_migration"
        ? (FULL_MIGRATION_TABLES as readonly string[])
        : (CLINICAL_BACKUP_TABLES as readonly string[]);

    const tables = Object.entries(
      parsedBackup.tables as Record<string, { columns: string[]; records: any[] }>,
    )
      .filter(([tableName]) => allowedTables.includes(tableName))
      .map(([tableName, data]) => ({
        tableName,
        recordCount: data.records?.length || 0,
        columns: data.columns || [],
      }));

    const totalRecords = tables.reduce((sum, t) => sum + t.recordCount, 0);

    // Extract user/admin summary for preview
    const usersInBackup = parsedBackup.tables.users?.records || [];
    const adminsInBackup = parsedBackup.tables.admins?.records || [];
    const adminUserIds = new Set(
      adminsInBackup.map((a: any) => a.user_id || a.userId),
    );

    const userSummary = usersInBackup.map((u: any) => ({
      id: u.id,
      firstName: u.first_name || u.firstName,
      lastName: u.last_name || u.lastName,
      email: u.email,
      accountType: u.account_type || u.accountType,
      isAdmin: adminUserIds.has(u.id),
    }));

    return NextResponse.json({
      setupToken,
      backupMode,
      createdAt: parsedBackup.createdAt,
      deviceInfo: parsedBackup.deviceInfo,
      tables,
      totalRecords,
      userSummary,
      adminCount: adminsInBackup.length,
    });
  } catch (error) {
    console.error("Setup upload-and-preview error:", error);
    return NextResponse.json(
      { message: "Failed to process backup file" },
      { status: 500 },
    );
  }
}
