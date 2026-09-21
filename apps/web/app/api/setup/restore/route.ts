// apps/web/app/api/setup/restore/route.ts
// Executes a full restore on an empty database using a previously uploaded backup.
// Guarded: only works when no users exist.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";
import { storageService } from "@/lib/storage";
import { executeRestore } from "@/lib/backup/restoreService";
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

    const { setupToken, requirePasswordReset } = await request.json();

    if (!setupToken) {
      return NextResponse.json(
        { message: "Missing required field: setupToken" },
        { status: 400 },
      );
    }

    // Find the temp backup file in S3
    // The upload-and-preview route stores it at setup-temp/{setupToken}.json
    // But storageService.upload prepends environment prefix, so we need to find it
    const env = process.env.NODE_ENV === "production" ? "production" : "dev";
    const tempFilePath = `${env}/setup-temp/${setupToken}.json`;

    let signedUrl: string;
    try {
      signedUrl = await storageService.getSignedUrl(tempFilePath);
    } catch {
      return NextResponse.json(
        { message: "Setup session expired or invalid token" },
        { status: 400 },
      );
    }

    // Download the backup JSON
    const response = await fetch(signedUrl);
    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to retrieve backup data" },
        { status: 500 },
      );
    }

    const backupData = await response.json();

    // Determine which tables to restore
    const backupMode = backupData.backupMode || "clinical";
    const allowedTables =
      backupMode === "full_migration"
        ? (FULL_MIGRATION_TABLES as readonly string[])
        : (CLINICAL_BACKUP_TABLES as readonly string[]);

    const selectedTables = Object.keys(backupData.tables).filter((t) =>
      allowedTables.includes(t),
    );

    // Execute restore — on empty DB, skip strategy effectively just inserts everything
    const results = await executeRestore({
      backupData,
      selectedTables,
      conflictStrategy: "skip",
    });

    // If password reset was requested, update all imported users
    if (requirePasswordReset && backupData.tables.users) {
      try {
        const { sql } = await import("drizzle-orm");
        await db.execute(
          sql`UPDATE users SET require_password_reset = true`,
        );
      } catch (err) {
        console.warn("Could not set requirePasswordReset flag:", err);
        // Non-fatal — the users are still imported
      }
    }

    // Clean up temp file
    try {
      await storageService.deleteByPrefix(tempFilePath);
    } catch {
      // Non-fatal cleanup
    }

    // Calculate totals
    const totals = results.reduce(
      (acc, r) => ({
        inserted: acc.inserted + r.inserted,
        updated: acc.updated + r.updated,
        skipped: acc.skipped + r.skipped,
        failed: acc.failed + r.failed,
      }),
      { inserted: 0, updated: 0, skipped: 0, failed: 0 },
    );

    return NextResponse.json({
      success: true,
      results,
      totals,
      backupMode,
    });
  } catch (error) {
    console.error("Setup restore error:", error);
    return NextResponse.json(
      { message: "Failed to restore database" },
      { status: 500 },
    );
  }
}
