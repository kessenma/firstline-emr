// apps/web/app/setup/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Upload,
  Lock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Users,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

interface TablePreview {
  tableName: string;
  recordCount: number;
  columns: string[];
}

interface UserPreview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  isAdmin: boolean;
}

interface PreviewData {
  setupToken: string;
  backupMode: string;
  createdAt: string;
  tables: TablePreview[];
  totalRecords: number;
  userSummary: UserPreview[];
  adminCount: number;
}

interface RestoreResult {
  tableName: string;
  inserted: number;
  skipped: number;
  failed: number;
}

type WizardStep = "choice" | "upload" | "preview" | "restoring" | "complete" | "error";

export default function SetupPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [dbIsEmpty, setDbIsEmpty] = useState(false);
  const [step, setStep] = useState<WizardStep>("choice");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [requirePasswordReset, setRequirePasswordReset] = useState(false);

  // Restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState<RestoreResult[] | null>(null);
  const [restoreTotals, setRestoreTotals] = useState<any>(null);
  const [restoreError, setRestoreError] = useState("");

  // Check if DB is empty on mount
  useEffect(() => {
    fetch("/api/setup/check")
      .then((res) => res.json())
      .then((data) => {
        setDbIsEmpty(data.isEmpty);
        if (!data.isEmpty) {
          router.replace("/auth");
        }
      })
      .catch(() => {
        router.replace("/auth");
      })
      .finally(() => setIsChecking(false));
  }, [router]);

  // Upload and preview
  const handleUpload = useCallback(async () => {
    if (!file || passphrase.length < 12) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("passphrase", passphrase);

      const res = await fetch("/api/setup/upload-and-preview", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }

      const data = await res.json();
      setPreview(data);
      setStep("preview");
    } catch (err: any) {
      setUploadError(err.message || "Failed to process backup file");
    } finally {
      setIsUploading(false);
    }
  }, [file, passphrase]);

  // Execute restore
  const handleRestore = useCallback(async () => {
    if (!preview?.setupToken) return;

    setIsRestoring(true);
    setRestoreError("");
    setStep("restoring");

    try {
      const res = await fetch("/api/setup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupToken: preview.setupToken,
          requirePasswordReset,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Restore failed");
      }

      const data = await res.json();
      setRestoreResults(data.results);
      setRestoreTotals(data.totals);
      setStep("complete");
    } catch (err: any) {
      setRestoreError(err.message || "Database restore failed");
      setStep("error");
    } finally {
      setIsRestoring(false);
    }
  }, [preview, requirePasswordReset]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dbIsEmpty) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Database className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Fajr MedFlow Setup
            </h1>
          </div>
          <p className="text-muted-foreground">
            Set up your new server by starting fresh or importing an existing
            database.
          </p>
        </div>

        {/* Step: Choice */}
        {step === "choice" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/auth")}
              className="border border-border rounded-xl p-6 text-left hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <Users className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start Fresh
              </h3>
              <p className="text-sm text-muted-foreground">
                Create a new admin account and set up the system from scratch.
              </p>
            </button>

            <button
              onClick={() => setStep("upload")}
              className="border border-border rounded-xl p-6 text-left hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Import Existing Database
              </h3>
              <p className="text-sm text-muted-foreground">
                Restore from an encrypted backup file (.fajr-backup) exported
                from another server or mobile device.
              </p>
            </button>
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="border border-border rounded-xl p-6 space-y-6">
            <button
              onClick={() => setStep("choice")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              &larr; Back
            </button>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Upload Encrypted Backup
              </h3>
              <p className="text-sm text-muted-foreground">
                Select a .fajr-backup file and enter the passphrase used to
                encrypt it.
              </p>
            </div>

            {/* File picker */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".fajr-backup"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setUploadError("");
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-foreground font-medium">
                      {file.name}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a .fajr-backup file
                    </p>
                  </div>
                )}
              </button>
            </div>

            {/* Passphrase */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Passphrase
              </label>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <input
                  type={showPassphrase ? "text" : "password"}
                  placeholder="Enter decryption passphrase (min 12 characters)"
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    setUploadError("");
                  }}
                  className="flex-1 px-4 py-3 bg-background text-foreground text-sm outline-none"
                />
                <button
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassphrase ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {passphrase.length}/12 characters minimum
              </p>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {uploadError}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || passphrase.length < 12 || isUploading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Decrypting & Analyzing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Decrypt & Preview
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && preview && (
          <div className="border border-border rounded-xl p-6 space-y-6">
            <button
              onClick={() => setStep("upload")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              &larr; Back
            </button>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Backup Preview
              </h3>
              <p className="text-sm text-muted-foreground">
                Review the contents before restoring.
              </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {preview.backupMode.replace("_", " ")}
                </p>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-sm font-semibold text-foreground">
                  {preview.totalRecords.toLocaleString()}
                </p>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Tables</p>
                <p className="text-sm font-semibold text-foreground">
                  {preview.tables.length}
                </p>
              </div>
            </div>

            {/* Tables */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Tables
              </h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">Table</th>
                      <th className="text-right px-3 py-2">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.tables.map((t) => (
                      <tr
                        key={t.tableName}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-1.5 text-foreground">
                          {t.tableName}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {t.recordCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Users preview */}
            {preview.userSummary.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  User Accounts ({preview.userSummary.length})
                </h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Email</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.userSummary.map((u) => (
                        <tr
                          key={u.id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-1.5 text-foreground">
                            {u.firstName} {u.lastName}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {u.email}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {u.accountType}
                          </td>
                          <td className="px-3 py-1.5">
                            {u.isAdmin && (
                              <Shield className="h-4 w-4 text-primary" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Password reset toggle */}
            {preview.userSummary.length > 0 && (
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={requirePasswordReset}
                  onChange={(e) => setRequirePasswordReset(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Require password reset for all imported users
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Users will be forced to change their password on first login.
                    All users must re-setup 2FA regardless.
                  </p>
                </div>
              </label>
            )}

            <button
              onClick={handleRestore}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Restore Database ({preview.totalRecords.toLocaleString()} records)
            </button>
          </div>
        )}

        {/* Step: Restoring */}
        {step === "restoring" && (
          <div className="border border-border rounded-xl p-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">
              Restoring Database...
            </h3>
            <p className="text-sm text-muted-foreground">
              This may take a few minutes. Do not close this page.
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && restoreTotals && (
          <div className="border border-border rounded-xl p-6 space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">
                Database Restored Successfully
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {restoreTotals.inserted} records inserted, {restoreTotals.skipped}{" "}
                skipped, {restoreTotals.failed} failed
              </p>
            </div>

            {/* Results table */}
            {restoreResults && (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">Table</th>
                      <th className="text-right px-3 py-2">Inserted</th>
                      <th className="text-right px-3 py-2">Skipped</th>
                      <th className="text-right px-3 py-2">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restoreResults.map((r) => (
                      <tr
                        key={r.tableName}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-1.5 text-foreground">
                          {r.tableName}
                        </td>
                        <td className="px-3 py-1.5 text-right text-green-600 dark:text-green-400">
                          {r.inserted}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {r.skipped}
                        </td>
                        <td className="px-3 py-1.5 text-right text-red-600 dark:text-red-400">
                          {r.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Post-Restore Checklist
                  </p>
                  <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                    <li>All users must re-setup 2FA (passkeys, TOTP)</li>
                    <li>Verify PowerSync sync rules point to the new database</li>
                    <li>Check that media files (S3 paths) still resolve</li>
                    <li>Test Telegram bot connectivity (if applicable)</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Go to Login
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="border border-red-200 dark:border-red-800 rounded-xl p-6 space-y-4">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">
                Restore Failed
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {restoreError}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("preview")}
                className="flex-1 border border-border py-3 rounded-lg font-medium text-sm"
              >
                Back to Preview
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
