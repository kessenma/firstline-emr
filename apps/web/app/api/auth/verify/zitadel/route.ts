// apps/web/app/api/auth/verify/zitadel/route.ts
// Reachability probe for the Verify-Auth tool: server-side fetch of the migrated
// Zitadel's OIDC discovery + JWKS. If Zitadel booted with the wrong masterkey it
// won't serve discovery, so a reachable + issuer-matching response is a good
// proxy for "Zitadel DB restored and masterkey valid". Done server-side to avoid
// browser CORS. No secrets involved — safe to call unauthenticated.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const ZITADEL_DOMAIN = process.env.ZITADEL_DOMAIN || "identity.fajrmission.org";

export async function GET() {
  const domain = ZITADEL_DOMAIN;
  const issuerExpected = `https://${domain}`;
  const discoveryUrl = `${issuerExpected}/.well-known/openid-configuration`;

  try {
    const res = await fetch(discoveryUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({
        reachable: false,
        domain,
        status: res.status,
        error: `Discovery returned HTTP ${res.status}`,
      });
    }

    const config = (await res.json()) as {
      issuer?: string;
      jwks_uri?: string;
    };
    const issuer = config.issuer ?? null;
    const issuerMatches = issuer === issuerExpected;

    // Best-effort JWKS reachability (non-fatal).
    let jwksReachable = false;
    if (config.jwks_uri) {
      try {
        const jwks = await fetch(config.jwks_uri, {
          signal: AbortSignal.timeout(6000),
        });
        jwksReachable = jwks.ok;
      } catch {
        jwksReachable = false;
      }
    }

    return NextResponse.json({
      reachable: true,
      domain,
      issuer,
      issuerMatches,
      jwksReachable,
    });
  } catch (error: any) {
    return NextResponse.json({
      reachable: false,
      domain,
      error:
        error?.name === "TimeoutError"
          ? "Zitadel did not respond (timeout). Is the container running?"
          : error?.message || "Could not reach Zitadel discovery endpoint.",
    });
  }
}
