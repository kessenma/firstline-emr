// apps/web/app/api/admin/GET/backups/storage-files/route.ts
// Lists backup files directly from object storage (S3/RustFS).
// This shows all .json backup files in storage, including any that may not
// have a corresponding DB record (e.g., orphaned files or files from
// a previous server instance).
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const env = storageService.getEnvironmentPrefix();

    // List all files under the backups/ prefix in current environment
    const files = await storageService.listFiles(`${env}/backups/`, 200);

    // Filter to only .json backup files and map to a clean response
    const backupFiles = await Promise.all(
      files
        .filter((f) => f.key.endsWith(".json"))
        .sort(
          (a, b) =>
            (b.lastModified?.getTime() || 0) -
            (a.lastModified?.getTime() || 0),
        )
        .map(async (f) => {
          // Extract a readable name from the key
          // e.g. "dev/backups/admin/user-id/2026-03-26T10-30-00-backup-1711234567890.json"
          const parts = f.key.split("/");
          const fileName = parts[parts.length - 1];

          // Generate a signed download URL
          let downloadUrl: string | null = null;
          try {
            downloadUrl = await storageService.getSignedUrl(f.key, 3600);
          } catch {
            // Non-fatal
          }

          return {
            key: f.key,
            fileName,
            fileSize: f.size,
            lastModified: f.lastModified?.toISOString() || null,
            downloadUrl,
          };
        }),
    );

    return NextResponse.json({ files: backupFiles });
  } catch (error) {
    console.error("List storage backup files error:", error);
    return NextResponse.json(
      { message: "Failed to list storage files" },
      { status: 500 },
    );
  }
}
