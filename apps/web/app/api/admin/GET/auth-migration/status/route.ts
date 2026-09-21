// apps/web/app/api/admin/GET/auth-migration/status/route.ts
// Admin-gated snapshot of auth-migration health: how many passkeys/TOTP secrets
// live in this DB, whether the env keys that make them usable are present, and
// whether Zitadel is reachable. Powers the read-only status card (web section
// header + mobile). The interactive proofs live in the public /verify-auth page.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  getWebauthnRpId,
  getZitadelExternalDomain,
} from "@/lib/backup/zitadelDump";

export async function GET(request: Request) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const countRows = await db.execute<{ passkeys: number; totp: number }>(
      sql`SELECT
        (SELECT count(*) FROM passkey_credentials WHERE is_active = true)::int AS passkeys,
        (SELECT count(*) FROM totp_credentials WHERE is_active = true)::int AS totp`,
    );
    const counts =
      (Array.isArray(countRows) ? countRows[0] : (countRows as any).rows?.[0]) ??
      { passkeys: 0, totp: 0 };

    const domain = getZitadelExternalDomain();
    let zitadelReachable = false;
    try {
      const res = await fetch(`https://${domain}/.well-known/openid-configuration`, {
        signal: AbortSignal.timeout(6000),
      });
      zitadelReachable = res.ok;
    } catch {
      zitadelReachable = false;
    }

    return NextResponse.json({
      passkeyCount: Number(counts.passkeys) || 0,
      totpCount: Number(counts.totp) || 0,
      // Presence only — never the key material.
      masterkeySet: !!process.env.ZITADEL_MASTERKEY,
      totpKeySet: !!process.env.TOTP_ENCRYPTION_KEY,
      webauthnRpId: getWebauthnRpId(),
      zitadelDomain: domain,
      zitadelReachable,
    });
  } catch (error) {
    console.error("Auth-migration status error:", error);
    return NextResponse.json(
      { message: "Failed to load auth-migration status" },
      { status: 500 },
    );
  }
}
