// apps/web/components/user-profile/TotpManagement.tsx
"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, Plus, Trash2, AlertCircle, Loader2, Check, ShieldCheck, ExternalLink } from "lucide-react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { CopyButton } from "@/components/ui/CopyButton"
import Image from "next/image"
import { AUTHENTICATOR_APPS, HIPAA_2FA_NOTICE, TOTP_ISSUER, TOTP_MANUAL_SETUP_STEPS } from "@fajr/shared/2fa"

interface TotpManagementProps {
    userEmail: string
    userId?: string
}

export function TotpManagement({ userEmail, userId }: TotpManagementProps) {
    const [hasTotp, setHasTotp] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Setup state
    const [isSettingUp, setIsSettingUp] = useState(false)
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
    const [manualEntryKey, setManualEntryKey] = useState<string | null>(null)
    const [setupToken, setSetupToken] = useState<string | null>(null)
    const [totpCode, setTotpCode] = useState("")
    const [setupLoading, setSetupLoading] = useState(false)
    const [setupError, setSetupError] = useState<string | null>(null)

    // Delete state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Test state
    const [isTesting, setIsTesting] = useState(false)
    const [testCode, setTestCode] = useState("")
    const [testLoading, setTestLoading] = useState(false)
    const [testResult, setTestResult] = useState<"success" | "fail" | null>(null)

    // Check current TOTP status
    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/auth/2fa/status?email=${encodeURIComponent(userEmail)}`)
            const data = await res.json()
            setHasTotp(data.hasTotp ?? false)
        } catch {
            setError("Failed to load TOTP status")
        } finally {
            setIsLoading(false)
        }
    }, [userEmail])

    useEffect(() => {
        checkStatus()
    }, [checkStatus])

    // Start TOTP setup
    const handleStartSetup = async () => {
        setSetupLoading(true)
        setSetupError(null)

        try {
            const res = await fetch("/api/auth/totp/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail }),
            })

            const data = await res.json()
            if (!res.ok) {
                setSetupError(data.error || "Failed to start setup")
                return
            }

            setQrCodeDataUrl(data.qrCodeDataUrl)
            setManualEntryKey(data.manualEntryKey)
            setSetupToken(data.setupToken)
            setIsSettingUp(true)
        } catch {
            setSetupError("Network error")
        } finally {
            setSetupLoading(false)
        }
    }

    // Verify TOTP code
    const handleVerify = async () => {
        if (!setupToken || totpCode.length !== 6) return
        setSetupLoading(true)
        setSetupError(null)

        try {
            const res = await fetch("/api/auth/totp/verify-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: totpCode,
                    setupToken,
                    ...(userId && { userId }),
                }),
            })

            const data = await res.json()
            if (!res.ok || !data.verified) {
                setSetupError(data.error || "Invalid code")
                setSetupLoading(false)
                return
            }

            // If we have userId, the server stored it. If not (setupToken flow), we need to store it.
            // For profile management, userId should be available via session.
            setHasTotp(true)
            setIsSettingUp(false)
            setQrCodeDataUrl(null)
            setManualEntryKey(null)
            setSetupToken(null)
            setTotpCode("")
        } catch {
            setSetupError("Network error")
        } finally {
            setSetupLoading(false)
        }
    }

    // Test TOTP code
    const handleTestCode = async () => {
        if (testCode.length !== 6) return
        setTestLoading(true)
        setTestResult(null)

        try {
            const res = await fetch("/api/auth/totp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, code: testCode }),
            })
            const data = await res.json()
            setTestResult(data.valid ? "success" : "fail")
        } catch {
            setTestResult("fail")
        } finally {
            setTestLoading(false)
        }
    }

    // Delete TOTP (would need a new API endpoint)
    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            // TODO: Add DELETE /api/auth/totp endpoint
            // For now, we'll just show the UI structure
            setShowDeleteConfirm(false)
            setHasTotp(false)
        } catch {
            setError("Failed to remove authenticator")
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Setup flow
    if (isSettingUp) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
                </p>

                {qrCodeDataUrl && (
                    <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-lg">
                            <Image src={qrCodeDataUrl} alt="TOTP QR Code" width={200} height={200} />
                        </div>
                    </div>
                )}

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

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Verification Code</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={(e) => { if (e.key === "Enter" && totpCode.length === 6) handleVerify(); }}
                        className="block w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground placeholder:tracking-[0.5em] placeholder:text-lg focus:outline-hidden focus:ring-ring focus:border-primary"
                    />
                </div>

                {setupError && <p className="text-sm text-destructive">{setupError}</p>}

                <div className="flex gap-2">
                    <Button onClick={() => { setIsSettingUp(false); setTotpCode(""); }} variant="outline" className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleVerify} disabled={totpCode.length !== 6 || setupLoading} className="flex-1">
                        {setupLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : "Verify"}
                    </Button>
                </div>
            </div>
        )
    }

    // Status display
    return (
        <div className="space-y-4">
            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80">&times;</button>
                </div>
            )}

            {hasTotp ? (
                <>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-foreground">Authenticator App</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Check className="h-3 w-3 text-primary" /> Configured
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Test Authenticator */}
                {!isTesting ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setIsTesting(true); setTestResult(null); setTestCode(""); }}
                        className="w-full"
                    >
                        Test Authenticator
                    </Button>
                ) : (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                        <div>
                            <p className="font-medium text-sm text-foreground">Test Your Authenticator</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Enter a code from your authenticator app to verify it&apos;s working correctly.
                            </p>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="000000"
                            value={testCode}
                            onChange={(e) => { setTestCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setTestResult(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter" && testCode.length === 6) handleTestCode(); }}
                            className={`block w-full px-3 py-2 rounded-md border bg-background text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground placeholder:tracking-[0.5em] placeholder:text-lg focus:outline-hidden focus:ring-ring ${
                                testResult === "success" ? "border-primary" : testResult === "fail" ? "border-destructive" : "border-border"
                            }`}
                        />
                        {testResult === "success" && (
                            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                                <Check className="h-4 w-4 text-primary shrink-0" />
                                <p className="text-sm text-primary">Code is valid — your authenticator is working.</p>
                            </div>
                        )}
                        {testResult === "fail" && (
                            <div className="p-2 bg-destructive/10 rounded-md">
                                <p className="text-sm text-destructive">Invalid code. Check your authenticator app and try again.</p>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => { setIsTesting(false); setTestCode(""); setTestResult(null); }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleTestCode}
                                disabled={testCode.length !== 6 || testLoading}
                                className="flex-1"
                            >
                                {testLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</> : "Test Code"}
                            </Button>
                        </div>
                    </div>
                )}
                </>
            ) : (
                <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border text-center">
                    <Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">No Authenticator App</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                        Add an authenticator app for two-factor authentication.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        {HIPAA_2FA_NOTICE}
                    </p>
                    <Button onClick={handleStartSetup} disabled={setupLoading} variant="default" size="sm">
                        {setupLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up...</>
                        ) : (
                            <><Plus className="h-4 w-4 mr-2" />Set Up Authenticator</>
                        )}
                    </Button>
                    <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Don&apos;t have an authenticator app?</p>
                        <div className="flex flex-wrap justify-center gap-2">
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
                </div>
            )}

            <AlertDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Remove Authenticator?"
                description="This will remove your authenticator app. You'll need to set it up again to use TOTP codes for sign-in. Make sure you have another 2FA method (like a passkey) before removing this."
                actionLabel="Remove"
                onAction={handleDelete}
            />
        </div>
    )
}
