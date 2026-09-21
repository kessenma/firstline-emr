import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/hooks/useToast";
import type {
  BackupSummary,
  RestorePreview,
  ConflictStrategy,
  RestoreTableResult,
  BackupMode,
  BackupAuthMeta,
} from "@fajr/shared/admin";

/** Result of GET /backups/[id]/auth-preflight. */
export interface AuthPreflightResult {
  includesAuth: boolean;
  zitadelConnected?: boolean;
  masterkeyMatch?: boolean;
  totpKeyMatch?: boolean;
  webauthnRpMatch?: boolean;
  domainMatch?: boolean;
  masterkeyEmbedded?: boolean;
  ready?: boolean;
  authMeta?: BackupAuthMeta;
}

export function useDatabaseBackupsViewModel() {
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<BackupSummary | null>(
    null,
  );
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoreResults, setRestoreResults] = useState<
    RestoreTableResult[] | null
  >(null);
  const [conflictStrategy, setConflictStrategy] =
    useState<ConflictStrategy>("skip");
  const [selectedRestoreTables, setSelectedRestoreTables] = useState<string[]>(
    [],
  );
  const [destructiveMode, setDestructiveMode] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [destructiveConfirmed, setDestructiveConfirmed] = useState(false);
  const [decryptPassphrase, setDecryptPassphrase] = useState("");
  // Restore the encrypted auth bundle alongside the app tables.
  const [restoreAuth, setRestoreAuth] = useState(false);
  const [authPreflight, setAuthPreflight] =
    useState<AuthPreflightResult | null>(null);
  const [isLoadingAuthPreflight, setIsLoadingAuthPreflight] = useState(false);

  const { data: session } = useSession();
  const token = session?.user.token;
  const { setToast } = useToast();

  const fetchBackups = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/GET/backups?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch backups");
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error("Error fetching backups:", error);
      setToast?.({
        title: "Error",
        description: "Failed to fetch backups.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, setToast]);

  useEffect(() => {
    if (token) fetchBackups();
  }, [fetchBackups, token]);

  const fetchPreview = useCallback(
    async (backupId: string) => {
      try {
        setIsLoadingPreview(true);
        setPreview(null);
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        // Send passphrase for encrypted backups
        if (selectedBackup?.encrypted && decryptPassphrase) {
          headers["X-Backup-Passphrase"] = decryptPassphrase;
        }
        const response = await fetch(
          `/api/admin/GET/backups/${backupId}/preview`,
          { headers },
        );
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to generate preview");
        }
        const data = await response.json();
        setPreview(data);
        // Pre-select all tables for restore
        setSelectedRestoreTables(
          data.tables?.map((t: any) => t.tableName) || [],
        );
      } catch (error) {
        console.error("Error fetching preview:", error);
        setToast?.({
          title: "Error",
          description: "Failed to generate restore preview.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [token, selectedBackup, decryptPassphrase, setToast],
  );

  const fetchAuthPreflight = useCallback(
    async (backupId: string) => {
      try {
        setIsLoadingAuthPreflight(true);
        setAuthPreflight(null);
        const response = await fetch(
          `/api/admin/GET/backups/${backupId}/auth-preflight`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) throw new Error("Failed to load auth preflight");
        const data = (await response.json()) as AuthPreflightResult;
        setAuthPreflight(data);
      } catch (error) {
        console.error("Auth preflight error:", error);
        setAuthPreflight(null);
      } finally {
        setIsLoadingAuthPreflight(false);
      }
    },
    [token],
  );

  const handleRestore = useCallback(async () => {
    if (!selectedBackup || selectedRestoreTables.length === 0) return;

    try {
      setIsRestoring(true);
      setRestoreResults(null);

      const response = await fetch("/api/admin/POST/backups/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          backupId: selectedBackup.id,
          selectedTables: selectedRestoreTables,
          conflictStrategy,
          destructive: destructiveMode,
          confirmationPhrase: destructiveMode ? confirmationPhrase : undefined,
          passphrase: selectedBackup.encrypted ? decryptPassphrase : undefined,
          restoreAuth: restoreAuth && !!selectedBackup.includesAuth,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Restore failed");
      }

      const data = await response.json();
      setRestoreResults(data.results);

      setToast?.({
        title: "Restore Complete",
        description:
          `Inserted: ${data.totals.inserted}, Skipped: ${data.totals.skipped}, Failed: ${data.totals.failed}` +
          (data.zitadelRestored ? " · Identity provider (Zitadel) restored" : ""),
        variant: data.totals.failed > 0 ? "destructive" : "default",
      });

      await fetchBackups();
    } catch (error: any) {
      console.error("Restore error:", error);
      setToast?.({
        title: "Restore Failed",
        description: error.message || "An error occurred during restore.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  }, [
    selectedBackup,
    selectedRestoreTables,
    conflictStrategy,
    destructiveMode,
    confirmationPhrase,
    decryptPassphrase,
    restoreAuth,
    token,
    setToast,
    fetchBackups,
  ]);

  const handleDelete = useCallback(
    async (backupId: string) => {
      try {
        setIsDeleting(true);
        const response = await fetch(
          `/api/admin/POST/backups/${backupId}/delete`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) throw new Error("Failed to delete backup");

        setToast?.({
          title: "Deleted",
          description: "Backup deleted successfully.",
        });

        if (selectedBackup?.id === backupId) {
          setSelectedBackup(null);
          setPreview(null);
        }

        await fetchBackups();
      } catch (error) {
        console.error("Delete error:", error);
        setToast?.({
          title: "Error",
          description: "Failed to delete backup.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [token, setToast, fetchBackups, selectedBackup],
  );

  // Server-side backup creation
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [createPassphrase, setCreatePassphrase] = useState("");
  // "Include authentication" bundle (passkeys/TOTP + Zitadel). Full-migration only.
  const [includeAuth, setIncludeAuth] = useState(false);
  const [embedMasterkey, setEmbedMasterkey] = useState(false);

  const handleCreateServerBackup = useCallback(
    async (mode: BackupMode) => {
      try {
        setIsCreatingServer(true);
        const body: Record<string, any> = { backupMode: mode };
        if (createPassphrase.length >= 12) {
          body.passphrase = createPassphrase;
        }
        if (includeAuth && mode === "full_migration") {
          body.includeAuth = true;
          body.embedMasterkey = embedMasterkey;
        }

        const response = await fetch(
          "/api/admin/POST/backups/create-server",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Server backup failed");
        }

        const data = await response.json();

        setToast?.({
          title: "Server Backup Created",
          description: `${data.backup.totalRecords} records backed up from ${data.backup.tables?.length || 0} tables.`,
        });

        setCreatePassphrase("");
        setIncludeAuth(false);
        setEmbedMasterkey(false);
        await fetchBackups();
      } catch (error: any) {
        console.error("Server backup error:", error);
        setToast?.({
          title: "Backup Failed",
          description: error.message || "Failed to create server backup.",
          variant: "destructive",
        });
      } finally {
        setIsCreatingServer(false);
      }
    },
    [token, createPassphrase, includeAuth, embedMasterkey, setToast, fetchBackups],
  );

  // ── S3 Storage File Browser ──
  interface StorageFile {
    key: string;
    fileName: string;
    fileSize: number;
    lastModified: string | null;
    downloadUrl: string | null;
  }

  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [isLoadingStorageFiles, setIsLoadingStorageFiles] = useState(false);
  const [showStorageFiles, setShowStorageFiles] = useState(false);

  const fetchStorageFiles = useCallback(async () => {
    try {
      setIsLoadingStorageFiles(true);
      const response = await fetch("/api/admin/GET/backups/storage-files", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch storage files");
      const data = await response.json();
      setStorageFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching storage files:", error);
      setToast?.({
        title: "Error",
        description: "Failed to list backup files from storage.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStorageFiles(false);
    }
  }, [token, setToast]);

  const toggleRestoreTable = useCallback((tableName: string) => {
    setSelectedRestoreTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName],
    );
  }, []);

  // ── Encrypted Download ──
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadEncrypted = useCallback(
    async (backupId: string, passphrase: string) => {
      try {
        setIsDownloading(true);
        const response = await fetch(
          `/api/admin/POST/backups/${backupId}/download-encrypted`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ passphrase }),
          },
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Download failed");
        }

        // Trigger browser download
        const blob = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        const fileName =
          contentDisposition?.match(/filename="(.+)"/)?.[1] ||
          "backup.fajr-backup";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setToast?.({
          title: "Download Complete",
          description: "Encrypted backup file downloaded.",
        });
      } catch (error: any) {
        console.error("Download encrypted error:", error);
        setToast?.({
          title: "Download Failed",
          description: error.message || "Failed to download encrypted backup.",
          variant: "destructive",
        });
      } finally {
        setIsDownloading(false);
      }
    },
    [token, setToast],
  );

  // ── Encrypted Upload ──
  const [isUploadingEncrypted, setIsUploadingEncrypted] = useState(false);

  const handleUploadEncrypted = useCallback(
    async (file: File, passphrase: string) => {
      try {
        setIsUploadingEncrypted(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("passphrase", passphrase);

        const response = await fetch(
          "/api/admin/POST/backups/upload-encrypted",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Upload failed");
        }

        const data = await response.json();

        setToast?.({
          title: "Upload Complete",
          description: `Backup imported: ${data.backup.totalRecords} records from ${data.backup.backupMode} backup.`,
        });

        await fetchBackups();
      } catch (error: any) {
        console.error("Upload encrypted error:", error);
        setToast?.({
          title: "Upload Failed",
          description: error.message || "Failed to upload encrypted backup.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingEncrypted(false);
      }
    },
    [token, setToast, fetchBackups],
  );

  return {
    backups,
    isLoading,
    selectedBackup,
    setSelectedBackup,
    preview,
    isLoadingPreview,
    fetchPreview,
    isRestoring,
    isDeleting,
    restoreResults,
    conflictStrategy,
    setConflictStrategy,
    selectedRestoreTables,
    setSelectedRestoreTables,
    toggleRestoreTable,
    handleRestore,
    handleDelete,
    fetchBackups,
    isCreatingServer,
    createPassphrase,
    setCreatePassphrase,
    includeAuth,
    setIncludeAuth,
    embedMasterkey,
    setEmbedMasterkey,
    handleCreateServerBackup,
    restoreAuth,
    setRestoreAuth,
    authPreflight,
    isLoadingAuthPreflight,
    fetchAuthPreflight,
    isDownloading,
    handleDownloadEncrypted,
    isUploadingEncrypted,
    handleUploadEncrypted,
    destructiveMode,
    setDestructiveMode,
    confirmationPhrase,
    setConfirmationPhrase,
    destructiveConfirmed,
    setDestructiveConfirmed,
    decryptPassphrase,
    setDecryptPassphrase,
    storageFiles,
    isLoadingStorageFiles,
    showStorageFiles,
    setShowStorageFiles,
    fetchStorageFiles,
  };
}
