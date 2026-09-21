// apps/mobile/src/components/admin/sections/backup/BackupView.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  HardDriveDownload,
  CheckSquare,
  Square,
  Clock,
  Database,
  Server,
  Shield,
  Share2,
  Lock,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useBackupViewModel } from '../../../../viewModels/admin/useBackupViewModel';
import PassphraseModal from './PassphraseModal';
import type { BackupMode } from '@fajr/shared/admin';

export default function BackupView() {
  const colors = useThemeColors();
  const {
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
    storageFiles,
    isLoadingStorageFiles,
    showStorageFiles,
    toggleStorageFiles,
    handleModeChange,
    toggleTable,
    selectAll,
    deselectAll,
    createBackup,
    fetchBackups,
    startExport,
    cancelExport,
    exportToFile,
    availableTables,
  } = useBackupViewModel();

  const getTableCount = (tableName: string) =>
    tableCounts.find((t) => t.tableName === tableName)?.count ?? 0;

  const totalSelectedRecords = selectedTables.reduce(
    (sum, t) => sum + getTableCount(t),
    0,
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isLoadingBackups} onRefresh={fetchBackups} />
      }
    >
      {/* Mode Selector */}
      <View style={styles.modeContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup Mode</Text>
        <View style={[styles.modeToggle, { borderColor: colors.border }]}>
          {(['clinical', 'full_migration'] as BackupMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeButton,
                backupMode === mode && {
                  backgroundColor: colors.primary,
                },
                backupMode !== mode && {
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => handleModeChange(mode)}
            >
              {mode === 'clinical' ? (
                <Shield size={16} color={backupMode === mode ? colors.textInverse : colors.textSecondary} />
              ) : (
                <Server size={16} color={backupMode === mode ? colors.textInverse : colors.textSecondary} />
              )}
              <Text
                style={[
                  styles.modeButtonText,
                  {
                    color: backupMode === mode ? colors.textInverse : colors.text,
                  },
                ]}
              >
                {mode === 'clinical' ? 'Clinical Backup' : 'Full Migration'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
          {backupMode === 'clinical'
            ? 'Backs up patient data, notes, orders, messages, and notifications.'
            : 'Full database export including user accounts for server migration. Excludes 2FA credentials.'}
        </Text>
      </View>

      {/* Table Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tables ({selectedTables.length}/{availableTables.length})
          </Text>
          <View style={styles.selectButtons}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={[styles.selectButtonText, { color: colors.primary }]}>
                All
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary }}> / </Text>
            <TouchableOpacity onPress={deselectAll}>
              <Text style={[styles.selectButtonText, { color: colors.primary }]}>
                None
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {availableTables.map((tableName) => {
          const isSelected = selectedTables.includes(tableName);
          const count = getTableCount(tableName);
          const Icon = isSelected ? CheckSquare : Square;

          return (
            <TouchableOpacity
              key={tableName}
              style={[
                styles.tableRow,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => toggleTable(tableName)}
            >
              <Icon
                size={20}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tableName,
                  { color: isSelected ? colors.text : colors.textSecondary },
                ]}
              >
                {tableName}
              </Text>
              <Text style={[styles.tableCount, { color: colors.textSecondary }]}>
                {count} records
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Encryption Passphrase */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Encryption (Optional)
        </Text>
        <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
          Set a passphrase to encrypt the backup at rest. Leave empty for unencrypted.
        </Text>
        <View
          style={[
            styles.passphraseInput,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Lock size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.passphraseTextInput, { color: colors.text }]}
            value={createPassphrase}
            onChangeText={setCreatePassphrase}
            placeholder="Passphrase (min 12 chars)"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>
        {createPassphrase.length > 0 && createPassphrase.length < 12 && (
          <Text style={[styles.passphraseHint, { color: colors.warning }]}>
            {createPassphrase.length}/12 characters minimum
          </Text>
        )}
      </View>

      {/* Create Backup Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: colors.primary },
            (isCreating || selectedTables.length === 0 || (createPassphrase.length > 0 && createPassphrase.length < 12)) && styles.disabledButton,
          ]}
          onPress={createBackup}
          disabled={isCreating || selectedTables.length === 0 || (createPassphrase.length > 0 && createPassphrase.length < 12)}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <HardDriveDownload size={20} color={colors.textInverse} />
          )}
          <Text style={[styles.createButtonText, { color: colors.textInverse }]}>
            {isCreating ? 'Creating Backup...' : 'Create Backup'}
          </Text>
        </TouchableOpacity>

        {selectedTables.length > 0 && (
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {selectedTables.length} tables, ~{totalSelectedRecords} records
          </Text>
        )}

        {/* Progress Indicator */}
        {progress.phase !== 'idle' && progress.phase !== 'done' && progress.phase !== 'error' && (
          <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={styles.progressInfo}>
              <Text style={[styles.progressPhase, { color: colors.text }]}>
                {progress.phase === 'counting' && 'Counting records...'}
                {progress.phase === 'reading' && `Reading ${progress.tableName}...`}
                {progress.phase === 'packaging' && 'Packaging backup...'}
                {progress.phase === 'uploading' && 'Uploading to server...'}
              </Text>
              {progress.total > 0 && (
                <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
                  {progress.current} / {progress.total}
                </Text>
              )}
            </View>
          </View>
        )}

        {progress.phase === 'done' && (
          <View style={[styles.progressCard, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <Database size={16} color={colors.success} />
            <Text style={[styles.progressPhase, { color: colors.success }]}>
              {progress.message}
            </Text>
          </View>
        )}

        {progress.phase === 'error' && (
          <View style={[styles.progressCard, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Text style={[styles.progressPhase, { color: colors.error }]}>
              {progress.message}
            </Text>
          </View>
        )}
      </View>

      {/* Backup History */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Backup History
        </Text>

        {isLoadingBackups && backups.length === 0 && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loadingIndicator}
          />
        )}

        {!isLoadingBackups && backups.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No backups yet. Create your first backup above.
          </Text>
        )}

        {backups.map((backup) => (
          <View
            key={backup.id}
            style={[
              styles.backupCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.backupHeader}>
              <View style={styles.backupTitleRow}>
                <HardDriveDownload size={16} color={colors.textSecondary} />
                <Text style={[styles.backupName, { color: colors.text }]}>
                  {backup.fileName}
                </Text>
              </View>
              <View
                style={[
                  styles.modeBadge,
                  {
                    backgroundColor:
                      backup.backupMode === 'full_migration'
                        ? (colors.warning) + '20'
                        : colors.primary + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeBadgeText,
                    {
                      color:
                        backup.backupMode === 'full_migration'
                          ? colors.warning
                          : colors.primary,
                    },
                  ]}
                >
                  {backup.backupMode === 'full_migration' ? 'Migration' : 'Clinical'}
                </Text>
              </View>
              {backup.encrypted && (
                <View style={[styles.modeBadge, { backgroundColor: '#7c3aed20' }]}>
                  <Lock size={10} color="#7c3aed" />
                </View>
              )}
            </View>

            <View style={styles.backupMeta}>
              <View style={styles.metaItem}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {formatDate(backup.createdAt)}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatFileSize(backup.fileSize)}
              </Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {backup.totalRecords} records
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      backup.status === 'available'
                        ? (colors.success || '#22c55e') + '20'
                        : backup.status === 'failed'
                          ? (colors.error || '#ef4444') + '20'
                          : colors.primary + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        backup.status === 'available'
                          ? colors.success || '#22c55e'
                          : backup.status === 'failed'
                            ? colors.error || '#ef4444'
                            : colors.primary,
                    },
                  ]}
                >
                  {backup.status}
                </Text>
              </View>
            </View>

            {/* Export Button */}
            {backup.status === 'available' && (
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { borderColor: colors.border },
                  isExporting && styles.disabledButton,
                ]}
                onPress={() => startExport(backup.id)}
                disabled={isExporting}
              >
                <Share2 size={14} color={colors.primary} />
                <Text style={[styles.exportButtonText, { color: colors.primary }]}>
                  Export Encrypted
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Storage File Browser */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.storageHeader, { borderColor: colors.border }]}
          onPress={toggleStorageFiles}
        >
          <View style={styles.storageHeaderLeft}>
            <FolderOpen size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Storage Files
            </Text>
          </View>
          {showStorageFiles ? (
            <ChevronUp size={18} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {showStorageFiles && (
          <View style={styles.storageContent}>
            {isLoadingStorageFiles ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loadingIndicator}
              />
            ) : storageFiles.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No backup files found in object storage.
              </Text>
            ) : (
              storageFiles.map((file) => (
                <View
                  key={file.key}
                  style={[
                    styles.storageFileRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.storageFileInfo}>
                    <Text
                      style={[styles.storageFileName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {file.fileName}
                    </Text>
                    <Text
                      style={[styles.metaText, { color: colors.textSecondary }]}
                    >
                      {formatFileSize(file.fileSize)}
                      {file.lastModified ? ` · ${formatDate(file.lastModified)}` : ''}
                    </Text>
                  </View>
                  {file.downloadUrl && (
                    <ExternalLink size={14} color={colors.primary} />
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />

      {/* Passphrase Modal */}
      <PassphraseModal
        visible={showPassphraseModal}
        title="Export Backup"
        requireConfirmation
        isLoading={isExporting}
        onSubmit={exportToFile}
        onCancel={cancelExport}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  modeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  modeDescription: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  selectButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  tableName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  tableCount: {
    fontSize: typography.fontSize.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  summaryText: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressInfo: {
    flex: 1,
  },
  progressPhase: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  progressCount: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  loadingIndicator: {
    marginTop: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    marginTop: spacing.md,
  },
  backupCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  backupName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  modeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  modeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  backupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.fontSize.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  passphraseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  passphraseTextInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
  passphraseHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  storageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storageContent: {
    marginTop: spacing.xs,
  },
  storageFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  storageFileInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  storageFileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  exportButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
