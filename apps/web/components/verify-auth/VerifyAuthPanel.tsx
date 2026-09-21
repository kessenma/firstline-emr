"use client";

// components/verify-auth/VerifyAuthPanel.tsx
// The interactive post-migration verification tool. Three self-contained checks
// that each prove a different piece of auth survived a server move — with no
// login required, so it works from a fresh browser (incl. the mobile app's
// "open in browser" card). Reused by app/verify-auth/page.tsx and the admin
// dashboard section.

import { useState } from "react";
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import {
  Fingerprint,
  Globe,
  KeyRound,
  Loader2,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "idle" | "running" | "ok" | "fail";

function StatusIcon({ status }: { status: Status }) {
  if (status === "running")
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (status === "ok")
    return <Check className="h-5 w-5 text-green-600 dark:text-green-400" />;
  if (status === "fail")
    return <X className="h-5 w-5 text-red-600 dark:text-red-400" />;
  return null;
}

export default function VerifyAuthPanel() {
  // ── Passkey test ──
  const [pkStatus, setPkStatus] = useState<Status>("idle");
  const [pkMsg, setPkMsg] = useState<string>("");

  async function testPasskey() {
    setPkStatus("running");
    setPkMsg("");
    try {
      if (!browserSupportsWebAuthn()) {
        setPkStatus("fail");
        setPkMsg("This browser does not support passkeys / WebAuthn.");
        return;
      }
      // Discoverable ceremony — no email needed; the browser offers any passkey
      // registered for this site.
      const optRes = await fetch("/api/auth/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error || "Could not start passkey check");
      const { challengeToken, ...optionsJSON } = optData;

      let credential;
      try {
        credential = await startAuthentication({ optionsJSON });
      } catch (e: any) {
        if (e?.name === "NotAllowedError") {
          setPkStatus("fail");
          setPkMsg("Passkey prompt was cancelled or timed out.");
          return;
        }
        throw e;
      }

      const verRes = await fetch("/api/auth/webauthn/verify-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, challengeToken }),
      });
      const verData = await verRes.json();
      if (verData.ok) {
        setPkStatus("ok");
        setPkMsg(
          `Passkey authenticated${verData.user?.email ? ` as ${verData.user.email}` : ""} — RP-ID "${verData.rpId}" matches. Passkeys survived the migration.`,
        );
      } else {
        setPkStatus("fail");
        setPkMsg(verData.error || "Passkey verification failed.");
      }
    } catch (e: any) {
      setPkStatus("fail");
      setPkMsg(e?.message || "Passkey check failed.");
    }
  }

  // ── Zitadel reachability test ──
  const [zStatus, setZStatus] = useState<Status>("idle");
  const [zMsg, setZMsg] = useState<string>("");

  async function testZitadel() {
    setZStatus("running");
    setZMsg("");
    try {
      const res = await fetch("/api/auth/verify/zitadel");
      const data = await res.json();
      if (data.reachable && data.issuerMatches) {
        setZStatus("ok");
        setZMsg(
          `Zitadel is up at ${data.domain} and issuing tokens for the right domain${data.jwksReachable ? " (JWKS reachable)" : ""}. Its database restored and the masterkey is valid.`,
        );
      } else if (data.reachable && !data.issuerMatches) {
        setZStatus("fail");
        setZMsg(
          `Zitadel responded but its issuer is "${data.issuer}", not "https://${data.domain}". The external domain likely changed — redirects and passkeys will break.`,
        );
      } else {
        setZStatus("fail");
        setZMsg(data.error || `Zitadel at ${data.domain} is unreachable.`);
      }
    } catch (e: any) {
      setZStatus("fail");
      setZMsg(e?.message || "Could not check Zitadel.");
    }
  }

  // ── TOTP (2FA) test ──
  const [tEmail, setTEmail] = useState("");
  const [tCode, setTCode] = useState("");
  const [tStatus, setTStatus] = useState<Status>("idle");
  const [tMsg, setTMsg] = useState<string>("");

  async function testTotp() {
    setTStatus("running");
    setTMsg("");
    try {
      const res = await fetch("/api/auth/verify/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tEmail, code: tCode }),
      });
      const data = await res.json();
      if (data.ok) {
        setTStatus("ok");
        setTMsg("2FA secret decrypted and the code validated — TOTP_ENCRYPTION_KEY matches. 2FA survived.");
      } else {
        setTStatus("fail");
        setTMsg(data.error || "2FA check failed.");
      }
    } catch (e: any) {
      setTStatus("fail");
      setTMsg(e?.message || "Could not check 2FA.");
    }
  }

  const cardTone = (s: Status) =>
    s === "ok"
      ? "border-green-300 dark:border-green-800"
      : s === "fail"
        ? "border-red-300 dark:border-red-800"
        : "border-border";

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-6 w-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Verify Auth Migration
          </h2>
          <p className="text-sm text-muted-foreground">
            Prove that passkeys, 2FA, and the Zitadel identity provider actually
            came across after a server move. Each check is self-contained and
            creates no login session.
          </p>
        </div>
      </div>

      {/* 1. Passkey */}
      <Card className={`p-4 space-y-3 ${cardTone(pkStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Test your passkey
            </h3>
          </div>
          <StatusIcon status={pkStatus} />
        </div>
        <p className="text-xs text-muted-foreground">
          Authenticates with a real passkey against this server&apos;s database —
          proving the credential migrated and the WebAuthn domain is preserved.
        </p>
        <Button size="sm" onClick={testPasskey} disabled={pkStatus === "running"}>
          {pkStatus === "running" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Fingerprint className="h-3.5 w-3.5 mr-1.5" />
          )}
          Test my passkey
        </Button>
        {pkMsg && (
          <p
            className={`text-xs ${pkStatus === "ok" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {pkMsg}
          </p>
        )}
      </Card>

      {/* 2. Zitadel */}
      <Card className={`p-4 space-y-3 ${cardTone(zStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Test identity provider (Zitadel)
            </h3>
          </div>
          <StatusIcon status={zStatus} />
        </div>
        <p className="text-xs text-muted-foreground">
          Checks that Zitadel is serving OIDC on the right domain — which requires
          its database restored and the masterkey valid.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={testZitadel}
          disabled={zStatus === "running"}
        >
          {zStatus === "running" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Globe className="h-3.5 w-3.5 mr-1.5" />
          )}
          Check Zitadel
        </Button>
        {zMsg && (
          <p
            className={`text-xs ${zStatus === "ok" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {zMsg}
          </p>
        )}
      </Card>

      {/* 3. TOTP */}
      <Card className={`p-4 space-y-3 ${cardTone(tStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Test 2FA (authenticator code)
            </h3>
          </div>
          <StatusIcon status={tStatus} />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your email and a current 6-digit code. Proves the TOTP secret
          decrypts on this server (TOTP_ENCRYPTION_KEY matches).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={tEmail}
            onChange={(e) => setTEmail(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground flex-1 min-w-[180px]"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="123456"
            value={tCode}
            onChange={(e) => setTCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground w-28"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={testTotp}
            disabled={tStatus === "running" || !tEmail || tCode.length !== 6}
          >
            {tStatus === "running" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
            )}
            Verify
          </Button>
        </div>
        {tMsg && (
          <p
            className={`text-xs ${tStatus === "ok" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {tMsg}
          </p>
        )}
      </Card>
    </div>
  );
}
