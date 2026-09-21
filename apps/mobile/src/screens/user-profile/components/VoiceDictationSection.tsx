// Section for managing voice dictation model downloads (LLM + TTS).
// STT uses native platform speech recognition — no download needed.
// Rendered inside ModelDownloadsSheet — no longer a standalone BottomSheet.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Mic,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Wifi,
  X,
  Brain,
  Volume2,
  FlaskConical,
} from 'lucide-react-native';
import { NetworkModeSwitch } from '../../../components/ui/NetworkModeSwitch';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import {
  useVoiceDictationModels,
  type VoiceDictationModelStatus,
} from '../../../hooks/useVoiceDictationModels';
import { useVoiceSensitivity } from '../../../hooks/useVoiceSensitivity';
import {
  SENSITIVITY_LABELS,
  SENSITIVITY_DESCRIPTIONS,
  type VoiceSensitivity,
} from '../../../components/patient-chart/notes/voice-dictation/constants';
import { VoiceDictationSheet } from '../../../components/patient-chart/notes/voice-dictation/VoiceDictationSheet';
import type { DictationResult } from '../../../components/patient-chart/notes/voice-dictation/useVoiceDictation';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatProgress(progress: number): string {
  return `${Math.round(progress * 100)}%`;
}

export const VoiceDictationSection: React.FC = () => {
  const colors = useThemeColors();
  const {
    llmModel,
    ttsModel,
    wifiOnly,
    setWifiOnly,
    canDownloadOnCurrentNetwork,
    downloadLLM,
    downloadTTS,
    deleteLLM,
    deleteTTS,
    totalStorageUsed,
  } = useVoiceDictationModels();

  const { sensitivity, setSensitivity } = useVoiceSensitivity();
  const [isTestOpen, setIsTestOpen] = useState(false);

  const handleTestResult = useCallback((fields: DictationResult) => {
    const lines: string[] = [];
    if (fields.procedureName) lines.push(`Procedure: ${fields.procedureName}`);
    if (fields.diagnosis) lines.push(`Diagnosis: ${fields.diagnosis}`);
    if (fields.notes) lines.push(`Notes: ${fields.notes}`);
    if (fields.plan) lines.push(`Plan: ${fields.plan}`);

    Alert.alert(
      'Test Result',
      lines.length > 0
        ? lines.join('\n\n')
        : 'No fields were captured.',
    );
  }, []);

  const isAnyDownloading = llmModel.isDownloading || ttsModel.isDownloading;
  const allDownloaded = ttsModel.isReady && llmModel.isReady;
  const canDownloadAll = !isAnyDownloading && !allDownloaded && canDownloadOnCurrentNetwork;

  const renderModelCard = (
    model: VoiceDictationModelStatus,
    label: string,
    estimatedSize: string,
    icon: React.ReactNode,
    onDownload: () => void,
    onDelete: () => void,
  ) => {
    return (
      <View
        style={[
          styles.modelCard,
          {
            backgroundColor: colors.surface,
            borderColor: model.isReady
              ? colors.success + '40'
              : colors.border,
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.modelCardHeader}>
          <View style={styles.modelCardLeft}>
            {icon}
            <View style={styles.modelCardInfo}>
              <Text style={[styles.modelName, { color: colors.text }]}>
                {label}
              </Text>
              <Text style={[styles.modelSize, { color: colors.textSecondary }]}>
                {model.isReady ? 'Downloaded' : `~${estimatedSize}`}
              </Text>
            </View>
          </View>

          {model.isReady && <CheckCircle size={20} color={colors.success} />}
          {model.error && !model.isDownloading && (
            <AlertCircle size={20} color={colors.error} />
          )}
        </View>

        {/* Progress bar */}
        {model.isDownloading && (
          <View style={styles.progressSection}>
            <View
              style={[
                styles.progressBarBg,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.round(model.downloadProgress * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, { color: colors.textSecondary }]}
            >
              Downloading... {formatProgress(model.downloadProgress)}
            </Text>
          </View>
        )}

        {/* Error message */}
        {model.error && !model.isDownloading && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {model.error}
          </Text>
        )}

        {/* Action button */}
        <View style={styles.modelCardActions}>
          {model.isReady ? (
            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: colors.error + '15' },
              ]}
              onPress={onDelete}
            >
              <Trash2 size={16} color={colors.error} />
              <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          ) : model.isDownloading ? (
            <View style={styles.downloadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  { backgroundColor: colors.error + '15' },
                ]}
                onPress={onDelete}
              >
                <X size={14} color={colors.error} />
                <Text
                  style={[styles.deleteButtonText, { color: colors.error }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.downloadButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isAnyDownloading ? 0.5 : 1,
                },
              ]}
              onPress={onDownload}
              disabled={isAnyDownloading}
            >
              <Download size={16} color={colors.surface} />
              <Text
                style={[styles.downloadButtonText, { color: colors.surface }]}
              >
                {model.error ? 'Retry' : 'Download'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
    <View style={styles.content}>
        {/* Info box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Mic size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Speech recognition uses your device's built-in engine (no download
            needed). Voice Prompts enables hands-free guided mode. Smart
            Extraction auto-fills note fields from your narration.
          </Text>
        </View>

        {/* WiFi toggle — shared with translation models */}
        <View
          style={[
            styles.networkCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.networkLeft}>
            <Wifi size={18} color={colors.primary} />
            <View style={styles.networkTextContainer}>
              <Text style={[styles.networkTitle, { color: colors.text }]}>
                Download AI Models on WiFi Only
              </Text>
              <Text
                style={[styles.networkDesc, { color: colors.textSecondary }]}
              >
                Shared with translation models
              </Text>
            </View>
          </View>
          <NetworkModeSwitch value={wifiOnly} onValueChange={setWifiOnly} />
        </View>

        {wifiOnly && !canDownloadOnCurrentNetwork && (
          <Text style={[styles.networkWarning, { color: colors.warning }]}>
            Connect to WiFi to download AI models.
          </Text>
        )}

        {/* Model cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Available Models
        </Text>

        {renderModelCard(
          ttsModel,
          'Voice Prompts',
          '50 MB',
          <Volume2 size={18} color={colors.primary} />,
          downloadTTS,
          deleteTTS,
        )}

        {renderModelCard(
          llmModel,
          'Smart Note Extraction',
          '900 MB',
          <Brain size={18} color={colors.primary} />,
          downloadLLM,
          deleteLLM,
        )}

        {/* Download All button */}
        {canDownloadAll && (
          <TouchableOpacity
            style={[
              styles.downloadAllButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              if (!ttsModel.isReady && !ttsModel.isDownloading) downloadTTS();
              if (!llmModel.isReady && !llmModel.isDownloading) downloadLLM();
            }}
          >
            <Download size={18} color={colors.textInverse} />
            <Text style={[styles.downloadAllText, { color: colors.textInverse }]}>Download All</Text>
          </TouchableOpacity>
        )}

        {/* Mic Sensitivity */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Mic Sensitivity
        </Text>
        <View
          style={[
            styles.sensitivityCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sensitivityDesc, { color: colors.textSecondary }]}>
            Choose how aggressively the recorder detects speech and drives the
            live level meter. Adaptive is recommended for most users.
          </Text>
          <View style={styles.sensitivityRow}>
            {(['adaptive', 'high', 'normal', 'low'] as VoiceSensitivity[]).map((level) => {
              const isActive = sensitivity === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.sensitivityOption,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.backgroundSecondary,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSensitivity(level)}
                >
                  <Text
                    style={[
                      styles.sensitivityLabel,
                      { color: isActive ? colors.textInverse : colors.text },
                    ]}
                  >
                    {SENSITIVITY_LABELS[level]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.sensitivityHint, { color: colors.textSecondary }]}>
            {SENSITIVITY_DESCRIPTIONS[sensitivity]}
          </Text>
        </View>

        {/* Storage summary */}
        {totalStorageUsed > 0 && (
          <View
            style={[
              styles.storageSummary,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <HardDrive size={16} color={colors.textSecondary} />
            <Text
              style={[styles.storageText, { color: colors.textSecondary }]}
            >
              Total storage used: {formatBytes(totalStorageUsed)}
            </Text>
          </View>
        )}

        {/* Try It Out — test dictation without saving */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
          Try It Out
        </Text>
        <View
          style={[
            styles.tryItCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <FlaskConical size={20} color={colors.primary} />
          <View style={styles.tryItTextContainer}>
            <Text style={[styles.tryItTitle, { color: colors.text }]}>
              Test Procedure Note Dictation
            </Text>
            <Text style={[styles.tryItDesc, { color: colors.textSecondary }]}>
              Try all dictation modes without saving to a patient chart.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.tryItButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => setIsTestOpen(true)}
          >
            <Mic size={16} color={colors.textInverse} />
            <Text style={[styles.tryItButtonText, { color: colors.textInverse }]}>Test</Text>
          </TouchableOpacity>
        </View>
    </View>

    <VoiceDictationSheet
      visible={isTestOpen}
      onClose={() => setIsTestOpen(false)}
      onFieldsReady={handleTestResult}
    />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  networkCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  networkLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  networkTextContainer: {
    flex: 1,
  },
  networkTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  networkDesc: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  networkWarning: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  modelCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modelCardInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  modelSize: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  modelCardActions: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  downloadButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  downloadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  downloadAllText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  sensitivityCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sensitivityDesc: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
  },
  sensitivityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sensitivityOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sensitivityLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  sensitivityHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  storageSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  storageText: {
    fontSize: typography.fontSize.sm,
  },
  tryItCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tryItTextContainer: {
    flex: 1,
  },
  tryItTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  tryItDesc: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  tryItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tryItButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default VoiceDictationSection;
