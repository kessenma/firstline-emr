"use client";

import React, { useState, useRef } from "react";
import {
  Loader2,
  HardDriveDownload,
  Trash2,
  Eye,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Server,
  Smartphone,
  Download,
  Upload,
  Lock,
  FolderOpen,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useDatabaseBackupsViewModel } from "./DatabaseBackupsViewModel";
import type { ConflictStrategy } from "@fajr/shared/admin";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * One line in the auth-restore readiness panel. `warnOnly` rows render an amber
 * warning (degraded, not blocking) instead of a red error when the check fails.
 */
function PreflightRow({
  ok,
  okLabel,
  failLabel,
  warnOnly,
}: {
  ok: boolean | undefined;
  okLabel: string;
  failLabel: string;
  warnOnly?: boolean;
}) {
  if (ok) {
    return (
      <li className="flex items-center gap-2 text-green-700 dark:text-green-400">
        <Check className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{okLabel}</span>
      </li>
    );
  }
  return (
    <li
      className={`flex items-center gap-2 ${
        warnOnly
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      <X className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{failLabel}</span>
    </li>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  uploading: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  restoring: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const SOURCE_COLORS: Record<string, string> = {
  mobile: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  server: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const MODE_COLORS: Record<string, string> = {
  clinical: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  full_migration: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function DatabaseBackupsView({
  isDialog,
}: {
  isDialog?: boolean;
}) {
  const vm = useDatabaseBackupsViewModel();
  const [expandedBackup, setExpandedBackup] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  // Encrypted download dialog state
  const [downloadDialogId, setDownloadDialogId] = useState<string | null>(null);
  const [downloadPassphrase, setDownloadPassphrase] = useState("");

  // Encrypted upload state
  const [uploadPassphrase, setUploadPassphrase] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  if (vm.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading backups...</span>
      </div>
    );
  }

  // Detail view when a backup is selected
  if (vm.selectedBackup) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            vm.setSelectedBackup(null);
            vm.setSelectedRestoreTables([]);
            vm.setRestoreAuth(false);
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to backup list
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {vm.selectedBackup.fileName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(vm.selectedBackup.createdAt)} by{" "}
              {vm.selectedBackup.createdByName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${MODE_COLORS[vm.selectedBackup.backupMode] || ""}`}
            >
              {vm.selectedBackup.backupMode === "full_migration"
                ? "Full Migration"
                : "Clinical"}
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[vm.selectedBackup.status] || ""}`}
            >
              {vm.selectedBackup.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <Card className="p-4">
            <p className="text-muted-foreground">Size</p>
            <p className="text-lg font-semibold">
              {formatFileSize(vm.selectedBackup.fileSize)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground">Total Records</p>
            <p className="text-lg font-semibold">
              {vm.selectedBackup.totalRecords.toLocaleString()}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground">Tables</p>
            <p className="text-lg font-semibold">
              {vm.selectedBackup.tables.length}
            </p>
          </Card>
        </div>

        {/* Table list from manifest */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            Tables in Backup
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-sm">
            {vm.selectedBackup.tables.map((t) => (
              <div
                key={t.tableName}
                className="flex justify-between px-2 py-1 rounded bg-muted/50"
              >
                <span className="text-foreground">{t.tableName}</span>
                <span className="text-muted-foreground">
                  {t.recordCount}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Decryption passphrase for encrypted backups */}
        {vm.selectedBackup.encrypted && (
          <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-950/30 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                This backup is encrypted
              </p>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Enter the passphrase used when creating this backup to preview or
              restore.
            </p>
            <input
              type="password"
              placeholder="Enter decryption passphrase"
              value={vm.decryptPassphrase}
              onChange={(e) => vm.setDecryptPassphrase(e.target.value)}
              className="border border-purple-300 dark:border-purple-700 rounded-md px-3 py-2 text-sm bg-background text-foreground w-full max-w-sm"
            />
          </div>
        )}

        {/* Preview & Restore Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => vm.fetchPreview(vm.selectedBackup!.id)}
              disabled={
                vm.isLoadingPreview ||
                (vm.selectedBackup.encrypted && !vm.decryptPassphrase)
              }
            >
              {vm.isLoadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview Restore
            </Button>

            {/* Conflict Strategy */}
            <select
              value={vm.conflictStrategy}
              onChange={(e) =>
                vm.setConflictStrategy(e.target.value as ConflictStrategy)
              }
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="skip">Skip existing records</option>
              <option value="overwrite">Overwrite all</option>
              <option value="newer_wins">Newer wins (by updatedAt)</option>
            </select>
          </div>

          {/* Destructive Mode (full_migration only) */}
          {vm.selectedBackup.backupMode === "full_migration" && (
            <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50 dark:bg-amber-950/30 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Destructive Restore Mode
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    When enabled, selected tables will be completely emptied
                    before restoring. Use this for a clean server migration.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vm.destructiveMode}
                  onChange={(e) => {
                    vm.setDestructiveMode(e.target.checked);
                    if (!e.target.checked) {
                      vm.setConfirmationPhrase("");
                      vm.setDestructiveConfirmed(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  Enable destructive restore (TRUNCATE tables before insert)
                </span>
              </label>

              {vm.destructiveMode && (
                <div className="space-y-2 pl-7">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Type <strong>DELETE ALL DATA</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    placeholder="Type confirmation phrase"
                    value={vm.confirmationPhrase}
                    onChange={(e) => vm.setConfirmationPhrase(e.target.value)}
                    className="border border-red-300 dark:border-red-700 rounded-md px-3 py-2 text-sm bg-background text-foreground w-full"
                  />
                  {vm.confirmationPhrase === "DELETE ALL DATA" && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vm.destructiveConfirmed}
                        onChange={(e) =>
                          vm.setDestructiveConfirmed(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="text-xs text-red-600 dark:text-red-400">
                        I understand this will permanently delete existing data
                        in the selected tables
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Also restore authentication (passkeys, 2FA, Zitadel) */}
          {vm.selectedBackup.includesAuth && (
            <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 bg-teal-50 dark:bg-teal-950/30 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-teal-800 dark:text-teal-200">
                    Authentication bundle available
                  </p>
                  <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                    Includes app passkeys, 2FA (TOTP), and the Zitadel identity
                    database. Restore only on the target server — with the same
                    masterkey and domain — and with Zitadel stopped.
                    {vm.selectedBackup.authMeta && (
                      <>
                        {" "}
                        ({vm.selectedBackup.authMeta.passkeyCount} passkeys,{" "}
                        {vm.selectedBackup.authMeta.totpCount} TOTP secrets)
                      </>
                    )}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vm.restoreAuth}
                  onChange={(e) => {
                    vm.setRestoreAuth(e.target.checked);
                    if (e.target.checked) {
                      vm.fetchAuthPreflight(vm.selectedBackup!.id);
                    }
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  Also restore authentication (passkeys, 2FA, Zitadel SSO)
                </span>
              </label>

              {vm.restoreAuth && (
                <div className="pl-7 space-y-2 text-xs">
                  {vm.isLoadingAuthPreflight ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking readiness…
                    </div>
                  ) : vm.authPreflight ? (
                    <ul className="space-y-1">
                      <PreflightRow
                        ok={vm.authPreflight.masterkeyMatch}
                        okLabel="Masterkey matches this server"
                        failLabel="Masterkey does NOT match — set the original ZITADEL_MASTERKEY first"
                      />
                      <PreflightRow
                        ok={!vm.authPreflight.zitadelConnected}
                        okLabel="Zitadel is stopped (safe to restore)"
                        failLabel="Zitadel is still running — stop the container before restoring"
                      />
                      <PreflightRow
                        ok={vm.authPreflight.webauthnRpMatch}
                        okLabel="WebAuthn domain matches — passkeys will keep working"
                        failLabel="WebAuthn RP-ID differs — users must re-enroll passkeys"
                        warnOnly
                      />
                      <PreflightRow
                        ok={vm.authPreflight.totpKeyMatch}
                        okLabel="TOTP key matches — 2FA preserved"
                        failLabel="TOTP_ENCRYPTION_KEY differs — 2FA secrets will not decrypt"
                        warnOnly
                      />
                      <PreflightRow
                        ok={vm.authPreflight.domainMatch}
                        okLabel="Zitadel domain matches"
                        failLabel="Zitadel domain differs — redirects/passkeys may break"
                        warnOnly
                      />
                      {vm.authPreflight.masterkeyEmbedded && (
                        <li className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            This backup embeds its masterkey for disaster
                            recovery — keep it protected.
                          </span>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      Could not load readiness.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview Results */}
          {vm.preview && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Restore Preview
              </h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 w-8"></th>
                      <th className="text-left px-3 py-2">Table</th>
                      <th className="text-right px-3 py-2">In Backup</th>
                      <th className="text-right px-3 py-2">Already Exist</th>
                      <th className="text-right px-3 py-2">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.preview.tables.map((t) => {
                      const isSelected = vm.selectedRestoreTables.includes(
                        t.tableName,
                      );
                      return (
                        <tr
                          key={t.tableName}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                          onClick={() => vm.toggleRestoreTable(t.tableName)}
                        >
                          <td className="px-3 py-2">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {t.tableName}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {t.recordCount}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {t.existingCount}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                            {t.newCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Restore Button */}
              <Dialog open={confirmRestore} onOpenChange={setConfirmRestore}>
                <DialogTrigger asChild>
                  <Button
                    disabled={
                      vm.isRestoring ||
                      vm.selectedRestoreTables.length === 0 ||
                      (vm.destructiveMode &&
                        (vm.confirmationPhrase !== "DELETE ALL DATA" ||
                          !vm.destructiveConfirmed))
                    }
                    variant={vm.destructiveMode ? "destructive" : "default"}
                  >
                    {vm.isRestoring ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    {vm.destructiveMode ? "Destructive " : ""}Restore{" "}
                    {vm.selectedRestoreTables.length} Tables
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Confirm Restore
                    </DialogTitle>
                    <DialogDescription>
                      This will restore{" "}
                      <strong>{vm.selectedRestoreTables.length} tables</strong>{" "}
                      using the <strong>{vm.conflictStrategy}</strong> strategy.
                      {vm.destructiveMode && (
                        <span className="block mt-2 text-red-600 dark:text-red-400 font-bold">
                          DESTRUCTIVE MODE: All existing data in selected tables
                          will be permanently deleted before restoring.
                        </span>
                      )}
                      {vm.selectedBackup.backupMode === "full_migration" &&
                        !vm.destructiveMode && (
                          <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                            This is a full migration backup that includes user
                            accounts. Proceed with caution.
                          </span>
                        )}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={() => {
                        setConfirmRestore(false);
                        vm.handleRestore();
                      }}
                    >
                      Confirm Restore
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Restore Results */}
          {vm.restoreResults && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Restore Results
              </h4>
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
                    {vm.restoreResults.map((r) => (
                      <tr
                        key={r.tableName}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2 text-foreground">
                          {r.tableName}
                        </td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                          {r.inserted}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {r.skipped}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                          {r.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Create Server Backup */}
      <Card className="border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Server className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Create Server Backup
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Export data directly from the server database to object storage.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Encryption Passphrase (optional, min 12 chars)
            </label>
            <input
              type="password"
              placeholder="Leave empty for unencrypted backup"
              value={vm.createPassphrase}
              onChange={(e) => vm.setCreatePassphrase(e.target.value)}
              className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground w-full max-w-sm"
            />
            {vm.createPassphrase.length > 0 &&
              vm.createPassphrase.length < 12 && (
                <p className="text-xs text-amber-600 mt-1">
                  {vm.createPassphrase.length}/12 characters minimum
                </p>
              )}
          </div>

          {/* Include authentication bundle (Full Migration only) */}
          <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-3 bg-teal-50 dark:bg-teal-950/30 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vm.includeAuth}
                onChange={(e) => {
                  vm.setIncludeAuth(e.target.checked);
                  if (!e.target.checked) vm.setEmbedMasterkey(false);
                }}
                className="h-4 w-4 rounded border-border mt-0.5"
              />
              <span>
                <span className="text-sm font-medium text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  Include authentication (passkeys, 2FA, Zitadel SSO)
                </span>
                <span className="block text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                  Bundles app passkeys/TOTP and the Zitadel identity database,
                  encrypted with your passphrase. Applies to Full Migration only
                  and requires a passphrase.
                </span>
              </span>
            </label>

            {vm.includeAuth && (
              <div className="pl-6 space-y-2">
                {vm.createPassphrase.length < 12 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    A passphrase (min 12 chars) is required to include
                    authentication.
                  </p>
                )}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vm.embedMasterkey}
                    onChange={(e) => vm.setEmbedMasterkey(e.target.checked)}
                    className="h-4 w-4 rounded border-border mt-0.5"
                  />
                  <span className="text-xs text-foreground">
                    Embed masterkey for disaster recovery
                    <span className="block text-amber-600 dark:text-amber-400">
                      Stores the Zitadel masterkey inside the encrypted backup so
                      a fresh server can recover it. Anyone with the passphrase
                      can read it — keep the file safe.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => vm.handleCreateServerBackup("clinical")}
              disabled={
                vm.isCreatingServer ||
                (vm.createPassphrase.length > 0 &&
                  vm.createPassphrase.length < 12)
              }
            >
              {vm.isCreatingServer ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <HardDriveDownload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Clinical Backup
              {vm.createPassphrase.length >= 12 && (
                <Lock className="h-3 w-3 ml-1" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => vm.handleCreateServerBackup("full_migration")}
              disabled={
                vm.isCreatingServer ||
                (vm.createPassphrase.length > 0 &&
                  vm.createPassphrase.length < 12) ||
                (vm.includeAuth && vm.createPassphrase.length < 12)
              }
            >
              {vm.isCreatingServer ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <HardDriveDownload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Full Migration
              {vm.includeAuth ? (
                <ShieldCheck className="h-3 w-3 ml-1 text-teal-600 dark:text-teal-400" />
              ) : (
                vm.createPassphrase.length >= 12 && (
                  <Lock className="h-3 w-3 ml-1" />
                )
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Upload Encrypted Backup */}
      <Card className="border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Import Encrypted Backup
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Upload a .fajr-backup file exported from another device or server.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={uploadInputRef}
            type="file"
            accept=".fajr-backup"
            className="hidden"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => uploadInputRef.current?.click()}
            disabled={vm.isUploadingEncrypted}
          >
            {uploadFile ? uploadFile.name : "Select .fajr-backup file"}
          </Button>
          {uploadFile && (
            <>
              <input
                type="password"
                placeholder="Passphrase (min 12 chars)"
                value={uploadPassphrase}
                onChange={(e) => setUploadPassphrase(e.target.value)}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground w-48"
              />
              <Button
                size="sm"
                onClick={() => {
                  vm.handleUploadEncrypted(uploadFile, uploadPassphrase).then(() => {
                    setUploadFile(null);
                    setUploadPassphrase("");
                    if (uploadInputRef.current) uploadInputRef.current.value = "";
                  });
                }}
                disabled={vm.isUploadingEncrypted || uploadPassphrase.length < 12}
              >
                {vm.isUploadingEncrypted ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                )}
                Decrypt & Import
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Storage File Browser */}
      <Card className="border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Object Storage Files
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              vm.setShowStorageFiles(!vm.showStorageFiles);
              if (!vm.showStorageFiles) vm.fetchStorageFiles();
            }}
          >
            {vm.showStorageFiles ? (
              <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
            )}
            {vm.showStorageFiles ? "Hide" : "Browse Files"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          View and download backup files stored in object storage (S3/RustFS).
        </p>

        {vm.showStorageFiles && (
          <div className="mt-4">
            {vm.isLoadingStorageFiles ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Scanning storage...
                </span>
              </div>
            ) : vm.storageFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No backup files found in object storage.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">File</th>
                      <th className="text-right px-3 py-2">Size</th>
                      <th className="text-right px-3 py-2">Modified</th>
                      <th className="text-right px-3 py-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.storageFiles.map((file) => (
                      <tr
                        key={file.key}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 text-foreground truncate max-w-[300px]">
                          <span title={file.key}>{file.fileName}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                          {formatFileSize(file.fileSize)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                          {file.lastModified
                            ? formatDate(file.lastModified)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {file.downloadUrl && (
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      <Separator />

      {/* Backup List */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {vm.backups.length === 0
            ? "No backups found. Create a backup above or from the mobile app."
            : `${vm.backups.length} backup${vm.backups.length !== 1 ? "s" : ""}`}
        </p>
        <Button variant="outline" size="sm" onClick={vm.fetchBackups}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {vm.backups.map((backup) => {
        const isExpanded = expandedBackup === backup.id;
        return (
          <Card
            key={backup.id}
            className="border border-border bg-card overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() =>
                setExpandedBackup(isExpanded ? null : backup.id)
              }
            >
              <div className="flex items-center gap-3">
                <HardDriveDownload className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {backup.fileName}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${MODE_COLORS[backup.backupMode] || ""}`}
                    >
                      {backup.backupMode === "full_migration"
                        ? "Migration"
                        : "Clinical"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${SOURCE_COLORS[backup.backupSource] || SOURCE_COLORS.mobile}`}
                    >
                      {backup.backupSource === "server" ? "Server" : "Mobile"}
                    </span>
                    {backup.encrypted && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" />
                        Encrypted
                      </span>
                    )}
                    {backup.includesAuth && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 flex items-center gap-0.5">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Auth
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(backup.createdAt)} &middot;{" "}
                    {backup.createdByName} &middot;{" "}
                    {formatFileSize(backup.fileSize)} &middot;{" "}
                    {backup.totalRecords.toLocaleString()} records
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[backup.status] || ""}`}
                >
                  {backup.status}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {backup.tables.map((t) => (
                    <span
                      key={t.tableName}
                      className="px-2 py-0.5 text-[10px] bg-muted rounded text-foreground"
                    >
                      {t.tableName} ({t.recordCount})
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      vm.setSelectedBackup(backup);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    View & Restore
                  </Button>
                  {/* Download Encrypted */}
                  <Dialog
                    open={downloadDialogId === backup.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setDownloadDialogId(null);
                        setDownloadPassphrase("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadDialogId(backup.id);
                        }}
                        disabled={backup.status !== "available"}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download Encrypted
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-primary" />
                          Encrypt & Download
                        </DialogTitle>
                        <DialogDescription>
                          Enter a passphrase to encrypt this backup before
                          downloading. You&apos;ll need this passphrase to
                          restore it.
                        </DialogDescription>
                      </DialogHeader>
                      <input
                        type="password"
                        placeholder="Passphrase (min 12 characters)"
                        value={downloadPassphrase}
                        onChange={(e) => setDownloadPassphrase(e.target.value)}
                        className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        {downloadPassphrase.length}/12 characters minimum
                      </p>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          disabled={
                            vm.isDownloading || downloadPassphrase.length < 12
                          }
                          onClick={() => {
                            vm.handleDownloadEncrypted(
                              backup.id,
                              downloadPassphrase,
                            ).then(() => {
                              setDownloadDialogId(null);
                              setDownloadPassphrase("");
                            });
                          }}
                        >
                          {vm.isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Download
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Backup</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete &quot;{backup.fileName}
                          &quot;? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => vm.handleDelete(backup.id)}
                          disabled={vm.isDeleting}
                        >
                          {vm.isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
