// apps/mobile/src/screens/user-profile/components/TranslationModelSection.tsx
// Section for managing on-device translation model downloads.
// Rendered inside ModelDownloadsSheet — no longer a standalone BottomSheet.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  Globe,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Languages,
  ArrowRight,
  Wifi,
  X,
} from 'lucide-react-native';
import { CTranslate2 } from '../../../native/CTranslate2/NativeCTranslate2';
import { TranslationModelService } from '../../../services/TranslationModelService';
import { NetworkModeSwitch } from '../../../components/ui/NetworkModeSwitch';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useTranslationModels } from '../hooks/useTranslationModels';
import type { ModelInfo, TranslationDirection } from '../../../services/TranslationModelService';

interface TranslationModelSectionProps {
  /** Called when the section becomes visible so it can refresh model state. */
  onVisible?: () => void;
}

const DIRECTION_LABELS: Record<TranslationDirection, string> = {
  'ar-en': 'Arabic \u2192 English',
  'en-ar': 'English \u2192 Arabic',
};

/** Returns true if the string contains Arabic characters. */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TranslationModelSection: React.FC<TranslationModelSectionProps> = ({
  onVisible,
}) => {
  const colors = useThemeColors();
  const {
    arEnModel,
    enArModel,
    isDownloading,
    wifiOnly,
    setWifiOnly,
    canDownloadOnCurrentNetwork,
    downloadModel,
    deleteModel,
    totalStorageUsed,
    refresh,
  } = useTranslationModels();

  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedDirection, setDetectedDirection] = useState<TranslationDirection | null>(null);

  const hasAnyModelReady = arEnModel.status === 'ready' || enArModel.status === 'ready';

  useEffect(() => {
    refresh();
    onVisible?.();
  }, [refresh, onVisible]);

  // Auto-detect direction as user types
  useEffect(() => {
    if (!testInput.trim()) {
      setDetectedDirection(null);
      return;
    }
    setDetectedDirection(isArabic(testInput) ? 'ar-en' : 'en-ar');
  }, [testInput]);

  const handleTranslate = useCallback(async () => {
    if (!testInput.trim() || !detectedDirection) return;

    const modelReady = detectedDirection === 'ar-en'
      ? arEnModel.status === 'ready'
      : enArModel.status === 'ready';
    if (!modelReady) return;

    setIsTranslating(true);
    setTestOutput('');
    try {
      const service = TranslationModelService.getInstance();
      const modelPath = service.getModelPath(detectedDirection);

      const alreadyLoaded = await CTranslate2.isModelLoaded(detectedDirection);
      if (!alreadyLoaded) {
        await CTranslate2.loadModel(modelPath, detectedDirection);
      }

      const result = await CTranslate2.translate(testInput.trim(), detectedDirection);
      setTestOutput(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setTestOutput(`Error: ${msg}`);
    } finally {
      setIsTranslating(false);
    }
  }, [testInput, detectedDirection, arEnModel.status, enArModel.status]);

  const renderModelCard = (model: ModelInfo) => {
    const isReady = model.status === 'ready';
    const isDownloadingThis = model.status === 'downloading';
    const hasError = model.status === 'error';

    return (
      <View
        key={model.direction}
        style={[
          styles.modelCard,
          {
            backgroundColor: colors.surface,
            borderColor: isReady
              ? colors.success + '40'
              : colors.border,
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.modelCardHeader}>
          <View style={styles.modelCardInfo}>
            <Text style={[styles.modelName, { color: colors.text }]}>
              {DIRECTION_LABELS[model.direction]}
            </Text>
            <Text
              style={[styles.modelSize, { color: colors.textSecondary }]}
            >
              {isReady
                ? formatBytes(model.sizeBytes)
                : '~75 MB'}
            </Text>
          </View>

          {/* Status icon */}
          {isReady && <CheckCircle size={20} color={colors.success} />}
          {hasError && <AlertCircle size={20} color={colors.error} />}
        </View>

        {/* Progress bar (downloading) */}
        {isDownloadingThis && (
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
                    width: `${model.progress}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                { color: colors.textSecondary },
              ]}
            >
              Downloading... {model.progress}%
            </Text>
          </View>
        )}

        {/* Error message */}
        {hasError && model.error && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {model.error}
          </Text>
        )}

        {/* Downloaded date */}
        {isReady && model.downloadedAt && (
          <Text
            style={[
              styles.downloadedDate,
              { color: colors.textTertiary },
            ]}
          >
            Downloaded{' '}
            {new Date(model.downloadedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        )}

        {/* Action button */}
        <View style={styles.modelCardActions}>
          {isReady ? (
            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: colors.error + '15' },
              ]}
              onPress={() => deleteModel(model.direction)}
            >
              <Trash2 size={16} color={colors.error} />
              <Text
                style={[styles.deleteButtonText, { color: colors.error }]}
              >
                Delete
              </Text>
            </TouchableOpacity>
          ) : isDownloadingThis ? (
            <View style={styles.downloadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  { backgroundColor: colors.error + '15' },
                ]}
                onPress={() => deleteModel(model.direction)}
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
                  opacity: isDownloading ? 0.5 : 1,
                },
              ]}
              onPress={() => downloadModel(model.direction)}
              disabled={isDownloading}
            >
              <Download size={16} color={colors.surface} />
              <Text
                style={[
                  styles.downloadButtonText,
                  { color: colors.surface },
                ]}
              >
                {hasError ? 'Retry' : 'Download'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.content}>
        {/* Info box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Globe size={20} color={colors.primary} />
          <Text
            style={[styles.infoText, { color: colors.textSecondary }]}
          >
            Download translation models for offline use. Each model is
            approximately 75 MB and enables Arabic-English translation
            without an internet connection.
          </Text>
        </View>

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
                Download Models on WiFi Only
              </Text>
              <Text style={[styles.networkDesc, { color: colors.textSecondary }]}>
                Use cellular + WiFi when off
              </Text>
            </View>
          </View>
          <NetworkModeSwitch
            value={wifiOnly}
            onValueChange={setWifiOnly}
          />
        </View>

        {wifiOnly && !canDownloadOnCurrentNetwork && (
          <Text style={[styles.networkWarning, { color: colors.warning }]}>
            Connect to WiFi to download translation models.
          </Text>
        )}

        {/* Model cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Available Models
        </Text>

        {renderModelCard(arEnModel)}
        {renderModelCard(enArModel)}

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
              style={[
                styles.storageText,
                { color: colors.textSecondary },
              ]}
            >
              Total storage used: {formatBytes(totalStorageUsed)}
            </Text>
          </View>
        )}

        {/* Test Translation */}
        {hasAnyModelReady && (
          <View style={[styles.testSection, { borderTopColor: colors.border }]}>
            <View style={styles.testHeader}>
              <Languages size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                Test Translation
              </Text>
            </View>

            {/* Direction indicator */}
            {detectedDirection && (
              <View style={styles.directionRow}>
                <Text style={[styles.directionLabel, { color: colors.textSecondary }]}>
                  {isArabic(testInput) ? 'Arabic' : 'English'}
                </Text>
                <ArrowRight size={14} color={colors.textTertiary} />
                <Text style={[styles.directionLabel, { color: colors.textSecondary }]}>
                  {isArabic(testInput) ? 'English' : 'Arabic'}
                </Text>
                {detectedDirection === 'ar-en' && arEnModel.status !== 'ready' && (
                  <Text style={[styles.directionWarning, { color: colors.warning }]}>
                    (model not downloaded)
                  </Text>
                )}
                {detectedDirection === 'en-ar' && enArModel.status !== 'ready' && (
                  <Text style={[styles.directionWarning, { color: colors.warning }]}>
                    (model not downloaded)
                  </Text>
                )}
              </View>
            )}

            {/* Input */}
            <TextInput
              style={[
                styles.testInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  textAlign: testInput && isArabic(testInput) ? 'right' : 'left',
                },
              ]}
              placeholder="Type text to translate..."
              placeholderTextColor={colors.textTertiary}
              value={testInput}
              onChangeText={setTestInput}
              multiline
            />

            {/* Translate button */}
            <TouchableOpacity
              style={[
                styles.translateButton,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    !testInput.trim() || !detectedDirection || isTranslating ||
                    (detectedDirection === 'ar-en' && arEnModel.status !== 'ready') ||
                    (detectedDirection === 'en-ar' && enArModel.status !== 'ready')
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={handleTranslate}
              disabled={
                !testInput.trim() || !detectedDirection || isTranslating ||
                (detectedDirection === 'ar-en' && arEnModel.status !== 'ready') ||
                (detectedDirection === 'en-ar' && enArModel.status !== 'ready')
              }
            >
              {isTranslating ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <>
                  <Globe size={16} color={colors.surface} />
                  <Text style={[styles.translateButtonText, { color: colors.surface }]}>
                    Translate
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Output */}
            {testOutput !== '' && (
              <View
                style={[
                  styles.testOutput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: testOutput.startsWith('Error:')
                      ? colors.error + '40'
                      : colors.success + '40',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.testOutputText,
                    {
                      color: testOutput.startsWith('Error:')
                        ? colors.error
                        : colors.text,
                      textAlign: detectedDirection === 'en-ar' ? 'right' : 'left',
                    },
                  ]}
                  selectable
                >
                  {testOutput}
                </Text>
              </View>
            )}
          </View>
        )}

    </View>
  );
};

const styles = StyleSheet.create({
  content: {
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
  downloadedDate: {
    fontSize: typography.fontSize.xs,
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
  testSection: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    paddingTop: spacing.lg,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  directionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  directionWarning: {
    fontSize: typography.fontSize.xs,
    marginLeft: spacing.xs,
  },
  testInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  translateButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  testOutput: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  testOutputText: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
});

export default TranslationModelSection;
