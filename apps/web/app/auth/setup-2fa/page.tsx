// apps/web/app/auth/setup-2fa/page.tsx
// Standalone 2FA setup page for existing users who need to configure 2FA
"use client";

import React, { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Smartphone, Fingerprint, Loader2, Check } from "lucide-react";
import { usePasskey } from "@/hooks/usePasskey";
import Image from "next/image";

export default function Setup2FAPage() {
  const { isSupported: passkeySupported, register: registerPasskey } = usePasskey();

  // TOTP state
  const [totpLoading, setTotpLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Passkey state
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);

  const handleStartTotpSetup = useCallback(async () => {
    if (!email) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error || "Failed to start setup");
        return;
      }

      setQrCodeDataUrl(data.qrCodeDataUrl);
      setManualEntryKey(data.manualEntryKey);
      setSetupToken(data.setupToken);
      setEmailSubmitted(true);
    } catch {
      setTotpError("Network error. Please try again.");
    } finally {
      setTotpLoading(false);
    }
  }, [email]);

  const handleVerifyTotp = useCallback(async () => {
    if (!setupToken || totpCode.length !== 6) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      // For existing users, we need to store via the authenticated endpoint
      // The verify-setup endpoint with setupToken handles this
      const res = await fetch("/api/auth/totp/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode, setupToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setTotpError(data.error || "Invalid code");
        setTotpLoading(false);
        return;
      }

      setTotpVerified(true);
    } catch {
      setTotpError("Network error.");
    } finally {
      setTotpLoading(false);
    }
  }, [setupToken, totpCode]);

  const handlePasskeySetup = useCallback(async () => {
    if (!email) return;
    setPasskeyLoading(true);
    try {
      const result = await registerPasskey(email);
      if (result?.verified) {
        setPasskeyRegistered(true);
      }
    } catch {
      // cancelled
    } finally {
      setPasskeyLoading(false);
    }
  }, [email, registerPasskey]);

  const handleContinue = () => {
    window.location.href = "/home";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Set Up Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your account requires 2FA for HIPAA compliance. Set up an authenticator app to continue.
          </p>
        </div>

        {!emailSubmitted ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
                className="block w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-ring focus:border-primary sm:text-sm"
              />
            </div>
            <Button onClick={handleStartTotpSetup} disabled={!email || totpLoading} className="w-full">
              {totpLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Smartphone className="h-4 w-4 mr-2" />}
              Set Up Authenticator
            </Button>
          </div>
        ) : totpVerified ? (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <Check className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Authenticator app configured!</p>
            </div>

            {passkeySupported && !passkeyRegistered && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Optional: add a passkey for faster sign-in
                </p>
                <Button onClick={handlePasskeySetup} disabled={passkeyLoading} variant="outline" className="w-full">
                  {passkeyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Fingerprint className="h-4 w-4 mr-2" />}
                  Add Passkey
                </Button>
              </div>
            )}

            {passkeyRegistered && (
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-primary">Passkey registered!</p>
              </div>
            )}

            <Button onClick={handleContinue} className="w-full">
              Continue to App
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app, then enter the 6-digit code.
            </p>

            {qrCodeDataUrl && (
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-lg">
                  <Image src={qrCodeDataUrl} alt="TOTP QR Code" width={200} height={200} />
                </div>
              </div>
            )}

            {manualEntryKey && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Or enter manually:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all">
                  {manualEntryKey}
                </code>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter" && totpCode.length === 6) handleVerifyTotp(); }}
                className="block w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-center text-2xl tracking-[0.5em] font-mono focus:outline-hidden focus:ring-ring focus:border-primary"
              />
            </div>

            {totpError && <p className="text-sm text-destructive">{totpError}</p>}

            <Button onClick={handleVerifyTotp} disabled={totpCode.length !== 6 || totpLoading} className="w-full">
              {totpLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verify Code
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
