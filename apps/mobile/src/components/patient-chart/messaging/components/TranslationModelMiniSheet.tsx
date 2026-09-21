// apps/mobile/src/components/patient-chart/messaging/components/TranslationModelMiniSheet.tsx
// Compact bottom sheet for downloading the ar-en translation model from within messaging.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Globe,
  Download,
  CheckCircle,
  AlertCircle,
  Trash2,
  Cpu,
  Wifi,
  X,
} from 'lucide-react-native';
import { BottomSheet } from '../../../BottomSheet';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useTranslationModels } from '../../../../screens/user-profile/hooks/useTranslationModels';

interface TranslationModelMiniSheetProps {
  visible: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TranslationModelMiniSheet: React.FC<TranslationModelMiniSheetProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const {
    arEnModel,
    isDownloading,
    downloadModel,
    deleteModel,
  } = useTranslationModels();

  const isReady = arEnModel.status === 'ready';
  const isDownloadingModel = arEnModel.status === 'downloading';
  const hasError = arEnModel.status === 'error';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Translation Mode"
      snapPoint={40}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.content}>
        {/* Current mode indicator */}
        <View
          style={[
            styles.modeIndicator,
            {
              backgroundColor: isReady
                ? colors.success + '15'
                : colors.primary + '15',
              borderColor: isReady
                ? colors.success + '40'
                : colors.primary + '40',
            },
          ]}
        >
          {isReady ? (
            <Cpu size={20} color={colors.success} />
          ) : (
            <Wifi size={20} color={colors.primary} />
          )}
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>
              {isReady ? 'On-Device Translation' : 'Online Translation'}
            </Text>
            <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
              {isReady
                ? 'Translating locally — works offline'
                : 'Using online service — requires internet'}
            </Text>
          </View>
        </View>

        {/* Info text */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Globe size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Download the Arabic → English model (~75 MB) for faster offline
            translation. Without it, translation uses the online service.
          </Text>
        </View>

        {/* Model card */}
        <View
          style={[
            styles.modelCard,
            {
              backgroundColor: colors.surface,
              borderColor: isReady ? colors.success + '40' : colors.border,
            },
          ]}
        >
          <View style={styles.modelCardHeader}>
            <View style={styles.modelCardInfo}>
              <Text style={[styles.modelName, { color: colors.text }]}>
                Arabic → English
              </Text>
              <Text style={[styles.modelSize, { color: colors.textSecondary }]}>
                {isReady ? formatBytes(arEnModel.sizeBytes) : '~75 MB'}
              </Text>
            </View>
            {isReady && <CheckCircle size={20} color={colors.success} />}
            {hasError && <AlertCircle size={20} color={colors.error} />}
          </View>

          {/* Progress bar */}
          {isDownloadingModel && (
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
                      width: `${arEnModel.progress}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Downloading... {arEnModel.progress}%
              </Text>
            </View>
          )}

          {/* Error */}
          {hasError && arEnModel.error && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {arEnModel.error}
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
                onPress={() => deleteModel('ar-en')}
              >
                <Trash2 size={14} color={colors.error} />
                <Text style={[styles.buttonText, { color: colors.error }]}>
                  Delete Model
                </Text>
              </TouchableOpacity>
            ) : isDownloadingModel ? (
              <View style={styles.downloadingRow}>
                <ActivityIndicator color={colors.primary} size="small" />
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    { backgroundColor: colors.error + '15' },
                  ]}
                  onPress={() => deleteModel('ar-en')}
                >
                  <X size={14} color={colors.error} />
                  <Text style={[styles.buttonText, { color: colors.error }]}>
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
                onPress={() => downloadModel('ar-en')}
                disabled={isDownloading}
              >
                <Download size={14} color={colors.surface} />
                <Text style={[styles.buttonText, { color: colors.surface }]}>
                  {hasError ? 'Retry Download' : 'Download Model'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  modeDescription: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  modelCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default TranslationModelMiniSheet;
