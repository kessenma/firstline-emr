// apps/web/app/api/admin/GET/backups/[id]/auth-preflight/route.ts
// Readiness check for restoring a backup's authentication bundle: compares the
// backup's stored env-key fingerprints against THIS server's live keys and
// reports whether Zitadel is still connected to its database.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { computeAuthPreflight } from "@/lib/backup/authBundle";
import { isZitadelConnected } from "@/lib/backup/zitadelDump";

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

    const [backup] = await db
      .select()
      .from(backups)
      .where(eq(backups.id, id))
      .limit(1);

    if (!backup) {
      return NextResponse.json({ message: "Backup not found" }, { status: 404 });
    }

    if (!backup.includesAuth || !backup.authMeta) {
      return NextResponse.json(
        { includesAuth: false },
        { status: 200 },
      );
    }

    const preflight = computeAuthPreflight(backup.authMeta);
    const zitadelConnected = (await isZitadelConnected()) > 0;

    return NextResponse.json({
      includesAuth: true,
      zitadelConnected,
      authMeta: backup.authMeta,
      ...preflight,
    });
  } catch (error) {
    console.error("Auth preflight error:", error);
    return NextResponse.json(
      { message: "Failed to compute auth preflight" },
      { status: 500 },
    );
  }
}
