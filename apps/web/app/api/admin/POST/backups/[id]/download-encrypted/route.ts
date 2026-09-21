// apps/web/app/api/admin/POST/backups/[id]/download-encrypted/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { encryptBackup } from "@/lib/backup/encryptionService";
import { BACKUP_MIN_PASSPHRASE_LENGTH, BACKUP_FILE_EXTENSION } from "@fajr/shared/backup";

export async function POST(
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
    const body = await request.json();
    const { passphrase } = body;

    if (!passphrase || passphrase.length < BACKUP_MIN_PASSPHRASE_LENGTH) {
      return NextResponse.json(
        { message: `Passphrase must be at least ${BACKUP_MIN_PASSPHRASE_LENGTH} characters` },
        { status: 400 },
      );
    }

    // Fetch backup
    const [backup] = await db
      .select()
      .from(backups)
      .where(eq(backups.id, id))
      .limit(1);

    if (!backup) {
      return NextResponse.json({ message: "Backup not found" }, { status: 404 });
    }

    if (backup.status !== "available" || !backup.filePath) {
      return NextResponse.json(
        { message: "Backup is not available for download" },
        { status: 400 },
      );
    }

    // Download backup JSON from S3
    const signedUrl = await storageService.getSignedUrl(backup.filePath);
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error("Failed to download backup from storage");
    }

    const jsonBuffer = Buffer.from(await response.arrayBuffer());

    // Encrypt
    const encrypted = encryptBackup(jsonBuffer, passphrase);

    // Build filename
    const baseName = backup.fileName?.replace(/\.json$/i, "") || "backup";
    const downloadName = `${baseName}${BACKUP_FILE_EXTENSION}`;

    return new Response(new Uint8Array(encrypted), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": String(encrypted.length),
      },
    });
  } catch (error) {
    console.error("Download encrypted backup error:", error);
    return NextResponse.json(
      { message: "Failed to download encrypted backup" },
      { status: 500 },
    );
  }
}
