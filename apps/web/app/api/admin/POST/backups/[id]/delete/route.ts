// apps/web/app/api/admin/POST/backups/[id]/delete/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups, backupRestores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";

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

    // Fetch backup to get file path
    const [backup] = await db
      .select({ id: backups.id, filePath: backups.filePath, status: backups.status })
      .from(backups)
      .where(eq(backups.id, id))
      .limit(1);

    if (!backup) {
      return NextResponse.json(
        { message: "Backup not found" },
        { status: 404 },
      );
    }

    if (backup.status === "restoring") {
      return NextResponse.json(
        { message: "Cannot delete a backup that is currently being restored" },
        { status: 409 },
      );
    }

    // Delete from S3
    try {
      await storageService.deleteByPrefix(backup.filePath);
    } catch (error) {
      console.error("Failed to delete backup file from S3:", error);
      // Continue with DB cleanup even if S3 delete fails
    }

    // Delete restore history first (FK constraint)
    await db
      .delete(backupRestores)
      .where(eq(backupRestores.backupId, id));

    // Delete backup record
    await db.delete(backups).where(eq(backups.id, id));

    return NextResponse.json({
      success: true,
      message: "Backup deleted successfully",
    });
  } catch (error) {
    console.error("Delete backup error:", error);
    return NextResponse.json(
      { message: "Failed to delete backup" },
      { status: 500 },
    );
  }
}
