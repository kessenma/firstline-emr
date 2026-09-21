// apps/web/app/api/admin/POST/backups/restore/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups, backupRestores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { executeRestore } from "@/lib/backup/restoreService";
import { decryptBackup } from "@/lib/backup/encryptionService";
import { applyAuthBundle, computeAuthPreflight } from "@/lib/backup/authBundle";
import { isZitadelConnected } from "@/lib/backup/zitadelDump";
import {
  CLINICAL_BACKUP_TABLES,
  FULL_MIGRATION_TABLES,
  type ConflictStrategy,
} from "@fajr/shared/admin";

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
      backupId,
      selectedTables,
      conflictStrategy,
      destructive,
      confirmationPhrase,
      passphrase,
      restoreAuth = false,
    }: {
      backupId: string;
      selectedTables: string[];
      conflictStrategy: ConflictStrategy;
      destructive?: boolean;
      confirmationPhrase?: string;
      passphrase?: string;
      restoreAuth?: boolean;
    } = await request.json();

    if (!backupId || !selectedTables?.length || !conflictStrategy) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: backupId, selectedTables, conflictStrategy",
        },
        { status: 400 },
      );
    }

    // Validate conflict strategy
    if (!["skip", "overwrite", "newer_wins"].includes(conflictStrategy)) {
      return NextResponse.json(
        { message: "Invalid conflict strategy" },
        { status: 400 },
      );
    }

    // Destructive mode requires confirmation phrase
    if (destructive && confirmationPhrase !== "DELETE ALL DATA") {
      return NextResponse.json(
        { message: "Destructive restore requires typing 'DELETE ALL DATA' to confirm" },
        { status: 400 },
      );
    }

    // Fetch backup
    const [backup] = await db
      .select()
      .from(backups)
      .where(eq(backups.id, backupId))
      .limit(1);

    if (!backup) {
      return NextResponse.json(
        { message: "Backup not found" },
        { status: 404 },
      );
    }

    if (backup.status !== "available") {
      return NextResponse.json(
        { message: `Backup is not available (status: ${backup.status})` },
        { status: 400 },
      );
    }

    // Auth-restore preflight — must pass BEFORE we touch anything, so the
    // caller gets a clean 4xx instead of a half-applied restore.
    if (restoreAuth) {
      if (!backup.includesAuth || !backup.authDumpPath) {
        return NextResponse.json(
          { message: "This backup does not include authentication data" },
          { status: 400 },
        );
      }
      if (!passphrase) {
        return NextResponse.json(
          { message: "A passphrase is required to restore the authentication bundle" },
          { status: 400 },
        );
      }
      // Cannot pg_restore the zitadel DB while Zitadel holds connections.
      const connections = await isZitadelConnected();
      if (connections > 0) {
        return NextResponse.json(
          {
            message:
              "Zitadel is still connected to its database. Stop the Zitadel container before restoring authentication.",
          },
          { status: 409 },
        );
      }
      // Masterkey must match this server (or be embedded for DR recovery), else
      // the restored secrets/passkeys will be undecryptable.
      if (backup.authMeta) {
        const pre = computeAuthPreflight(backup.authMeta);
        if (!pre.ready) {
          return NextResponse.json(
            {
              message:
                "This server's ZITADEL_MASTERKEY does not match the backup. Set the original masterkey before restoring authentication.",
            },
            { status: 409 },
          );
        }
      }
    }

    // Validate selected tables against backup mode
    const allowedTables =
      backup.backupMode === "full_migration"
        ? (FULL_MIGRATION_TABLES as readonly string[])
        : (CLINICAL_BACKUP_TABLES as readonly string[]);

    const invalidTables = selectedTables.filter(
      (t) => !allowedTables.includes(t),
    );
    if (invalidTables.length > 0) {
      return NextResponse.json(
        { message: `Invalid tables: ${invalidTables.join(", ")}` },
        { status: 400 },
      );
    }

    // Mark backup as restoring
    await db
      .update(backups)
      .set({ status: "restoring", updatedAt: new Date() })
      .where(eq(backups.id, backupId));

    // Create restore record
    const [restoreRecord] = await db
      .insert(backupRestores)
      .values({
        backupId,
        restoredBy: session.userId,
        status: "in_progress",
        conflictStrategy,
        startedAt: new Date(),
      })
      .returning();

    try {
      // Download backup from S3
      const signedUrl = await storageService.getSignedUrl(backup.filePath);
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error("Failed to download backup file from storage");
      }

      // Handle encrypted backups
      let backupData: any;
      if (backup.encrypted) {
        if (!passphrase) {
          throw new Error("This backup is encrypted. A passphrase is required to restore.");
        }
        const encryptedBuffer = Buffer.from(await response.arrayBuffer());
        const decrypted = decryptBackup(encryptedBuffer, passphrase);
        backupData = JSON.parse(decrypted.toString("utf-8"));
      } else {
        backupData = await response.json();
      }

      // Execute restore
      const results = await executeRestore({
        backupData,
        selectedTables,
        conflictStrategy,
        destructive,
      });

      // Restore the encrypted auth bundle (passkey/TOTP rows + Zitadel DB) after
      // app tables (users must exist first). Preflight already validated above.
      let zitadelRestored = false;
      if (restoreAuth && backup.includesAuth && backup.authDumpPath) {
        const authSignedUrl = await storageService.getSignedUrl(
          backup.authDumpPath,
        );
        const authResponse = await fetch(authSignedUrl);
        if (!authResponse.ok) {
          throw new Error("Failed to download authentication bundle from storage");
        }
        const encryptedAuth = Buffer.from(await authResponse.arrayBuffer());
        const envelope = decryptBackup(encryptedAuth, passphrase!);
        const authResult = await applyAuthBundle(envelope, conflictStrategy);
        results.push(...authResult.credentialResults);
        zitadelRestored = authResult.zitadelRestored;
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

      // Collect errors
      const errorLog = results
        .flatMap((r) =>
          (r.errors || []).map((e) => ({
            tableName: r.tableName,
            recordId: "",
            error: e,
            timestamp: new Date().toISOString(),
          })),
        )
        .slice(0, 1000); // Cap error log at 1000 entries

      // Update restore record
      await db
        .update(backupRestores)
        .set({
          status: totals.failed > 0 && totals.inserted === 0 ? "failed" : "completed",
          tablesRestored: results,
          totalInserted: totals.inserted,
          totalUpdated: totals.updated,
          totalSkipped: totals.skipped,
          totalFailed: totals.failed,
          errorLog: errorLog.length > 0 ? errorLog : null,
          completedAt: new Date(),
        })
        .where(eq(backupRestores.id, restoreRecord.id));

      // Reset backup status
      await db
        .update(backups)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(backups.id, backupId));

      return NextResponse.json({
        success: true,
        restoreId: restoreRecord.id,
        results,
        totals,
        zitadelRestored,
      });
    } catch (error: any) {
      // Update restore record as failed
      await db
        .update(backupRestores)
        .set({
          status: "failed",
          errorLog: [
            {
              tableName: "general",
              recordId: "",
              error: error.message?.slice(0, 500),
              timestamp: new Date().toISOString(),
            },
          ],
          completedAt: new Date(),
        })
        .where(eq(backupRestores.id, restoreRecord.id));

      // Reset backup status
      await db
        .update(backups)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(backups.id, backupId));

      throw error;
    }
  } catch (error) {
    console.error("Restore backup error:", error);
    return NextResponse.json(
      { message: "Failed to restore backup" },
      { status: 500 },
    );
  }
}
