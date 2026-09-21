// apps/mobile/src/viewModels/admin/useBackupViewModel.ts
import { useState, useCallback, useEffect } from 'react';
import { Platform, Alert, Share } from 'react-native';
import {
  TemporaryDirectoryPath,
  writeFile,
  unlink,
  exists,
} from '@dr.pogodin/react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';
import { powerSyncService } from '../../services/powersync/PowerSyncService';
import {
  CLINICAL_BACKUP_TABLES,
  FULL_MIGRATION_TABLES,
  type BackupMode,
  type BackupSummary,
  type BackupTableManifest,
} from '@fajr/shared/admin';
import { BACKUP_FILE_EXTENSION } from '@fajr/shared/backup';

// Simple SHA-256 is not available in Hermes — use a checksum placeholder
// or skip checksum on mobile (server will accept without one)
const APP_VERSION = '1.0.0'; // TODO: pull from app config

export interface BackupProgress {
  phase: 'idle' | 'counting' | 'reading' | 'packaging' | 'uploading' | 'done' | 'error';
  current: number;
  total: number;
  tableName?: string;
  message?: string;
}

export interface TableCount {
  tableName: string;
  count: number;
}

export function useBackupViewModel() {
  const [backupMode, setBackupMode] = useState<BackupMode>('clinical');
  const [selectedTables, setSelectedTables] = useState<string[]>([
    ...CLINICAL_BACKUP_TABLES,
  ]);
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<BackupProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
  });
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [createPassphrase, setCreatePassphrase] = useState('');

  // Get available tables based on mode
  const availableTables = useCallback(() => {
    return backupMode === 'full_migration'
      ? [...FULL_MIGRATION_TABLES]
      : [...CLINICAL_BACKUP_TABLES];
  }, [backupMode]);

  // When mode changes, update selected tables
  const handleModeChange = useCallback(
    (mode: BackupMode) => {
      setBackupMode(mode);
      const tables =
        mode === 'full_migration'
          ? [...FULL_MIGRATION_TABLES]
          : [...CLINICAL_BACKUP_TABLES];
      setSelectedTables(tables);
    },
    [],
  );

  // Toggle individual table selection
  const toggleTable = useCallback((tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName],
    );
  }, []);

  // Select/deselect all
  const selectAll = useCallback(() => {
    setSelectedTables([...availableTables()]);
  }, [availableTables]);

  const deselectAll = useCallback(() => {
    setSelectedTables([]);
  }, []);

  // Count records per table from local PowerSync DB
  const loadTableCounts = useCallback(async () => {
    setProgress({ phase: 'counting', current: 0, total: availableTables().length });
    const counts: TableCount[] = [];

    for (let i = 0; i < availableTables().length; i++) {
      const tableName = availableTables()[i];
      try {
        const count = await powerSyncService.count(tableName);
        counts.push({ tableName, count });
      } catch {
        counts.push({ tableName, count: 0 });
      }
    }

    setTableCounts(counts);
    setProgress({ phase: 'idle', current: 0, total: 0 });
  }, [availableTables]);

  // Create backup
  const createBackup = useCallback(async () => {
    if (selectedTables.length === 0) {
      Alert.alert('No Tables Selected', 'Please select at least one table to backup.');
      return;
    }

    setIsCreating(true);
    const tempPath = `${TemporaryDirectoryPath}/backup-${Date.now()}.json`;

    try {
      // Phase 1: Read data from PowerSync
      const tablesData: Record<string, { columns: string[]; records: any[] }> = {};
      const manifest: BackupTableManifest[] = [];

      for (let i = 0; i < selectedTables.length; i++) {
        const tableName = selectedTables[i];
        setProgress({
          phase: 'reading',
          current: i + 1,
          total: selectedTables.length,
          tableName,
        });

        try {
          const records = await powerSyncService.getAll<any>(tableName);
          const columns = records.length > 0 ? Object.keys(records[0]) : [];

          tablesData[tableName] = { columns, records };
          manifest.push({ tableName, recordCount: records.length, columns });
        } catch (error: any) {
          console.warn(`Failed to read table ${tableName}:`, error.message);
          // Skip tables that fail (might not exist in this sync bucket)
          manifest.push({ tableName, recordCount: 0, columns: [] });
        }
      }

      // Phase 2: Package as JSON
      setProgress({ phase: 'packaging', current: 0, total: 1 });

      const payload = {
        version: 1,
        backupMode,
        createdAt: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS as 'ios' | 'android',
          appVersion: APP_VERSION,
        },
        tables: tablesData,
      };

      const jsonString = JSON.stringify(payload);

      // Write to temp file
      await writeFile(tempPath, jsonString, 'utf8');

      // Phase 3: Upload
      setProgress({ phase: 'uploading', current: 0, total: 1 });

      const token = await storageUtils.getToken();
      const apiUrl = getApiUrl();

      const totalRecords = manifest.reduce((sum, t) => sum + t.recordCount, 0);

      const formData = new FormData();
      formData.append('file', {
        uri: `file://${tempPath}`,
        type: 'application/json',
        name: `backup-${Date.now()}.json`,
      } as any);
      formData.append('tables', JSON.stringify(manifest));
      formData.append('totalRecords', String(totalRecords));
      formData.append('backupMode', backupMode);
      formData.append(
        'deviceInfo',
        JSON.stringify({
          platform: Platform.OS,
          appVersion: APP_VERSION,
        }),
      );

      // Include passphrase for at-rest encryption if provided
      if (createPassphrase.length >= 12) {
        formData.append('passphrase', createPassphrase);
      }

      const response = await fetch(
        `${apiUrl}/api/admin/POST/backups/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Upload failed (${response.status})`);
      }

      setCreatePassphrase('');
      setProgress({
        phase: 'done',
        current: 1,
        total: 1,
        message: `Backup created${createPassphrase.length >= 12 ? ' (encrypted)' : ''}: ${totalRecords} records from ${manifest.filter((t) => t.recordCount > 0).length} tables`,
      });

      // Refresh backup list
      await fetchBackups();
    } catch (error: any) {
      console.error('Backup creation failed:', error);
      setProgress({
        phase: 'error',
        current: 0,
        total: 0,
        message: error.message || 'Backup failed',
      });
      Alert.alert('Backup Failed', error.message || 'An error occurred while creating the backup.');
    } finally {
      setIsCreating(false);
      // Clean up temp file
      try {
        if (await exists(tempPath)) {
          await unlink(tempPath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [selectedTables, backupMode, createPassphrase]);

  // Fetch existing backups from API
  const fetchBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      const token = await storageUtils.getToken();
      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/api/admin/GET/backups?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  // ── Storage file browser state ──
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
      const token = await storageUtils.getToken();
      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/api/admin/GET/backups/storage-files`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) return;

      const data = await response.json();
      setStorageFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch storage files:', error);
    } finally {
      setIsLoadingStorageFiles(false);
    }
  }, []);

  const toggleStorageFiles = useCallback(() => {
    const next = !showStorageFiles;
    setShowStorageFiles(next);
    if (next) fetchStorageFiles();
  }, [showStorageFiles, fetchStorageFiles]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [exportBackupId, setExportBackupId] = useState<string | null>(null);

  // Start export flow — show passphrase modal
  const startExport = useCallback((backupId: string) => {
    setExportBackupId(backupId);
    setShowPassphraseModal(true);
  }, []);

  const cancelExport = useCallback(() => {
    setShowPassphraseModal(false);
    setExportBackupId(null);
  }, []);

  // Export a backup as encrypted .fajr-backup file via share sheet.
  // Uses the server's download-encrypted endpoint — no local crypto needed.
  const exportToFile = useCallback(async (passphrase: string) => {
    if (!exportBackupId) return;

    setIsExporting(true);
    const tempPath = `${TemporaryDirectoryPath}/backup-${Date.now()}${BACKUP_FILE_EXTENSION}`;

    try {
      const token = await storageUtils.getToken();
      const apiUrl = getApiUrl();

      // Ask server to encrypt and return the file
      const res = await fetch(
        `${apiUrl}/api/admin/POST/backups/${exportBackupId}/download-encrypted`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ passphrase }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Download failed (${res.status})`);
      }

      // Get Content-Disposition filename
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const serverFileName =
        contentDisposition.match(/filename="(.+)"/)?.[1] || `backup${BACKUP_FILE_EXTENSION}`;

      // Write encrypted bytes to temp file
      const arrayBuffer = await res.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      await writeFile(tempPath, base64Data, 'base64');

      setShowPassphraseModal(false);

      // Share via system share sheet
      if (Platform.OS === 'ios') {
        await Share.share({ url: `file://${tempPath}` });
      } else {
        const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
        const destPath = `${downloadDir}/${serverFileName}`;
        await ReactNativeBlobUtil.fs.cp(tempPath, destPath);
        await ReactNativeBlobUtil.android.actionViewIntent(destPath, 'application/octet-stream');
      }

      Alert.alert('Export Complete', 'Encrypted backup file has been exported.');
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', error.message || 'An error occurred while exporting the backup.');
    } finally {
      setIsExporting(false);
      setExportBackupId(null);
      try {
        if (await exists(tempPath)) {
          await unlink(tempPath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [exportBackupId]);

  // Load initial data
  useEffect(() => {
    loadTableCounts();
    fetchBackups();
  }, []);

  // Reload counts when mode changes
  useEffect(() => {
    loadTableCounts();
  }, [backupMode]);

  return {
    // State
    backupMode,
    selectedTables,
    tableCounts,
    isCreating,
    progress,
    backups,
    isLoadingBackups,
    isExporting,
    showPassphraseModal,
    createPassphrase,
    setCreatePassphrase,
    // Actions
    handleModeChange,
    toggleTable,
    selectAll,
    deselectAll,
    createBackup,
    fetchBackups,
    startExport,
    cancelExport,
    exportToFile,
    storageFiles,
    isLoadingStorageFiles,
    showStorageFiles,
    toggleStorageFiles,
    availableTables: availableTables(),
  };
}
