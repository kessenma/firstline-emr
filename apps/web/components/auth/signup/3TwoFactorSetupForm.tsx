"use client";

import React, { useState, useCallback } from "react";
import { useSignupContext } from "@/components/auth/signup/container/SignupContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Fingerprint, Loader2, Check, Smartphone, ExternalLink } from "lucide-react";
import { usePasskey } from "@/hooks/usePasskey";
import Image from "next/image";
import { CopyButton } from "@/components/ui/CopyButton";
import { AUTHENTICATOR_APPS, HIPAA_2FA_NOTICE, TOTP_ISSUER, TOTP_MANUAL_SETUP_STEPS } from "@fajr/shared/2fa";

const TwoFactorSetupForm: React.FC = () => {
  const { formData, setFormData, setTwoFactorSetupCompleted, updateAnsweredQuestions } =
    useSignupContext();

  const { isSupported: passkeySupported, register: registerPasskey } = usePasskey();

  // TOTP setup state
  const [totpLoading, setTotpLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpVerified, setTotpVerified] = useState(!!formData.totpCredentialData);
  const [totpError, setTotpError] = useState<string | null>(null);

  // Passkey state
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(!!formData.passkeyCredential);

  // Step 1: Generate TOTP secret and QR code
  const handleStartTotpSetup = useCallback(async () => {
    if (!formData.email) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error || "Failed to start TOTP setup");
        return;
      }

      setQrCodeDataUrl(data.qrCodeDataUrl);
      setManualEntryKey(data.manualEntryKey);
      setSetupToken(data.setupToken);
    } catch {
      setTotpError("Network error. Please try again.");
    } finally {
      setTotpLoading(false);
    }
  }, [formData.email]);

  // Step 2: Verify TOTP code
  const handleVerifyTotp = useCallback(async () => {
    if (!setupToken || totpCode.length !== 6) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch("/api/auth/totp/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode, setupToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setTotpError(data.error || "Invalid code. Please try again.");
        setTotpLoading(false);
        return;
      }

      // Store credential data in form context
      setFormData((prev) => ({
        ...prev,
        totpCredentialData: data.totpCredentialData,
        twoFactorSetupCompleted: true,
      }));
      setTotpVerified(true);
      setTwoFactorSetupCompleted(true);
      updateAnsweredQuestions(2, 1);
    } catch {
      setTotpError("Network error. Please try again.");
    } finally {
      setTotpLoading(false);
    }
  }, [setupToken, totpCode, setFormData, setTwoFactorSetupCompleted, updateAnsweredQuestions]);

  // Optional: Register passkey
  const handlePasskeySetup = useCallback(async () => {
    if (!formData.email) return;
    setPasskeyLoading(true);

    try {
      const result = await registerPasskey(formData.email);
      if (result?.verified && result?.pendingCredential) {
        setFormData((prev) => ({
          ...prev,
          passkeyEnabled: true,
          passkeyCredential: result.pendingCredential,
        }));
        setPasskeyRegistered(true);
      }
    } catch (err: any) {
      // Silently handle cancellation
      if (!err?.message?.includes("cancelled") && !err?.message?.includes("canceled")) {
        console.error("Passkey setup error:", err);
      }
    } finally {
      setPasskeyLoading(false);
    }
  }, [formData.email, registerPasskey, setFormData]);

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="space-y-6 w-full">
        <div className="text-center mb-4">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
          <h2 className="text-xl font-semibold text-foreground">Set Up Two-Factor Authentication</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Secure your account with an authenticator app
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {HIPAA_2FA_NOTICE}
          </p>
        </div>

        {/* TOTP Setup (Required) */}
        <Card className={`p-6 transition-shadow duration-300 ${totpVerified ? "border-primary shadow-lg" : "border-muted"} bg-card`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Authenticator App
              </h3>
              {totpVerified && <Check className="h-5 w-5 text-primary" />}
            </div>

            {totpVerified ? (
              <p className="text-sm text-muted-foreground">
                Authenticator app configured successfully.
              </p>
            ) : !qrCodeDataUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app like Microsoft Authenticator, Google Authenticator, or Authy.
                </p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">Don&apos;t have one? Download here:</p>
                  <div className="flex flex-wrap gap-2">
                    {AUTHENTICATOR_APPS.map((app) => (
                      <a
                        key={app.name}
                        href={app.web}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {app.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleStartTotpSetup}
                  disabled={totpLoading}
                  className="w-full"
                >
                  {totpLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up...</>
                  ) : (
                    "Set Up Authenticator"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app, then enter the 6-digit code below.
                </p>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg">
                    <Image
                      src={qrCodeDataUrl}
                      alt="TOTP QR Code"
                      width={200}
                      height={200}
                    />
                  </div>
                </div>

                {/* Manual entry */}
                {manualEntryKey && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">Or add manually:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      {TOTP_MANUAL_SETUP_STEPS.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Account name</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all flex-1">{TOTP_ISSUER}</code>
                        <CopyButton textToCopy={TOTP_ISSUER} label="Account name" size="icon" variant="ghost" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">Secret key</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all flex-1">{manualEntryKey}</code>
                        <CopyButton textToCopy={manualEntryKey} label="Secret key" size="icon" variant="ghost" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Code input */}
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
                    className="block w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground placeholder:tracking-[0.5em] placeholder:text-lg focus:outline-hidden focus:ring-ring focus:border-primary"
                  />
                </div>

                {totpError && (
                  <p className="text-sm text-destructive">{totpError}</p>
                )}

                <Button
                  type="button"
                  onClick={handleVerifyTotp}
                  disabled={totpCode.length !== 6 || totpLoading}
                  className="w-full"
                >
                  {totpLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Passkey Setup (Optional) */}
        {passkeySupported && totpVerified && (
          <Card className={`p-6 transition-shadow duration-300 ${passkeyRegistered ? "border-primary shadow-lg" : "border-muted"} bg-card`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" />
                  Passkey (Optional)
                </h3>
                {passkeyRegistered && <Check className="h-5 w-5 text-primary" />}
              </div>

              {passkeyRegistered ? (
                <p className="text-sm text-muted-foreground">
                  Passkey registered. You can use Face ID, Touch ID, or fingerprint to sign in faster.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add a passkey for faster, passwordless sign-in using Face ID, Touch ID, or fingerprint.
                  </p>
                  <Button
                    type="button"
                    onClick={handlePasskeySetup}
                    disabled={passkeyLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {passkeyLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up...</>
                    ) : (
                      <><Fingerprint className="h-4 w-4 mr-2" />Add Passkey for Faster Login</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetupForm;
