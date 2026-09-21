// apps/web/app/api/admin/GET/backups/[id]/preview/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { decryptBackup } from "@/lib/backup/encryptionService";
import type { RestorePreviewTable } from "@fajr/shared/admin";

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

    // Fetch backup record
    const [backup] = await db
      .select()
      .from(backups)
      .where(eq(backups.id, id))
      .limit(1);

    if (!backup) {
      return NextResponse.json(
        { message: "Backup not found" },
        { status: 404 },
      );
    }

    if (backup.status !== "available") {
      return NextResponse.json(
        { message: "Backup is not available for preview" },
        { status: 400 },
      );
    }

    // Download backup from S3
    const signedUrl = await storageService.getSignedUrl(backup.filePath);
    const response = await fetch(signedUrl);
    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to download backup file" },
        { status: 500 },
      );
    }

    // Handle encrypted backups — passphrase comes from X-Backup-Passphrase header
    let backupData: any;
    if (backup.encrypted) {
      const passphrase = request.headers.get("X-Backup-Passphrase");
      if (!passphrase) {
        return NextResponse.json(
          { message: "This backup is encrypted. Provide passphrase via X-Backup-Passphrase header.", encrypted: true },
          { status: 400 },
        );
      }
      try {
        const encryptedBuffer = Buffer.from(await response.arrayBuffer());
        const decrypted = decryptBackup(encryptedBuffer, passphrase);
        backupData = JSON.parse(decrypted.toString("utf-8"));
      } catch (err: any) {
        return NextResponse.json(
          { message: err.message || "Decryption failed — wrong passphrase?" },
          { status: 400 },
        );
      }
    } else {
      backupData = await response.json();
    }
    const tables: RestorePreviewTable[] = [];

    // For each table in the backup, compare against current PostgreSQL data
    for (const [tableName, tableData] of Object.entries(
      backupData.tables as Record<
        string,
        { columns: string[]; records: Record<string, any>[] }
      >,
    )) {
      const records = tableData.records || [];
      const backupIds = records
        .map((r: any) => r.id)
        .filter(Boolean);

      let existingCount = 0;
      if (backupIds.length > 0) {
        try {
          // Count how many IDs already exist in the target table
          const result = await db.execute(
            sql`SELECT count(*) as count FROM ${sql.identifier(tableName)} WHERE id = ANY(${backupIds}::uuid[])`,
          );
          existingCount =
            Number(
              (result as any).rows?.[0]?.count ??
                (result as any)[0]?.count ??
                0,
            ) || 0;
        } catch {
          // Table might not exist or other error — just report 0
          existingCount = 0;
        }
      }

      const newCount = records.length - existingCount;
      const sampleRecords = records.slice(0, 3);

      tables.push({
        tableName,
        recordCount: records.length,
        existingCount,
        newCount,
        conflictCount: existingCount,
        sampleRecords,
      });
    }

    return NextResponse.json({
      backupId: id,
      tables,
    });
  } catch (error) {
    console.error("Preview backup error:", error);
    return NextResponse.json(
      { message: "Failed to generate preview" },
      { status: 500 },
    );
  }
}
