// apps/mobile/src/components/DataSettingsOnboardingSheet.tsx
// First-login onboarding sheet for data download preferences.
// Shown once after login when user hasn't configured data settings yet.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  Database,
  Image as ImageIcon,
  Languages,
  Download,
  CheckCircle,
  Mic,
} from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './ui/Button';
import { NetworkModeSwitch } from './ui/NetworkModeSwitch';
import { useThemeColors } from '../contexts/ThemeContext';
import { useDataSizeEstimate, formatBytes } from '../hooks/useDataSizeEstimate';
import { usePatientDataNetworkMode } from '../hooks/usePatientDataNetworkMode';
import { useTranslationModels } from '../screens/user-profile/hooks/useTranslationModels';
import type { ModelInfo } from '../services/TranslationModelService';
import {
  markDataOnboardingComplete,
  type QueuedTranslationDirection,
  type QueuedVoiceModel,
  setPendingVoiceModelDownloads,
} from '../utils/dataOnboarding';
import { isVoiceLLMModelDownloaded, isVoiceTTSModelDownloaded } from '../hooks/useVoiceDictationModels';
import { FeatureFlags } from '../config/featureFlags';
import { spacing, borderRadius, typography } from '../utils/theme';

interface DataSettingsOnboardingSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: (payload: {
    queuedModelDownloads: QueuedTranslationDirection[];
    queuedVoiceModelDownloads: QueuedVoiceModel[];
    translationModelWifiOnly: boolean;
  }) => void;
}

export const DataSettingsOnboardingSheet: React.FC<DataSettingsOnboardingSheetProps> = ({
  visible,
  onClose,
  onComplete,
}) => {
  const colors = useThemeColors();
  const estimate = useDataSizeEstimate();

  const {
    wifiOnly: patientDataWifiOnly,
    setWifiOnly: setPatientDataWifiOnly,
  } = usePatientDataNetworkMode();
  const {
    arEnModel,
    enArModel,
    wifiOnly: translationWifiOnly,
    setWifiOnly: setTranslationWifiOnly,
  } = useTranslationModels();

  // Local state for immediate toggle feedback
  const [localPatientDataWifi, setLocalPatientDataWifi] = useState(patientDataWifiOnly);
  const [queueArEnDownload, setQueueArEnDownload] = useState(arEnModel.status !== 'ready');
  const [queueEnArDownload, setQueueEnArDownload] = useState(enArModel.status !== 'ready');
  // STT uses native platform APIs — no download needed
  const [queueTTSDownload, setQueueTTSDownload] = useState(
    FeatureFlags.VOICE_DICTATION && !isVoiceTTSModelDownloaded(),
  );
  const [queueLLMDownload, setQueueLLMDownload] = useState(false); // LLM is large (~900MB), opt-in
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    setIsSaving(true);
    const queuedModelDownloads: QueuedTranslationDirection[] = [];
    if (queueArEnDownload && arEnModel.status !== 'ready') queuedModelDownloads.push('ar-en');
    if (queueEnArDownload && enArModel.status !== 'ready') queuedModelDownloads.push('en-ar');

    const queuedVoiceModelDownloads: QueuedVoiceModel[] = [];
    if (queueTTSDownload && !isVoiceTTSModelDownloaded()) queuedVoiceModelDownloads.push('tts');
    if (queueLLMDownload && !isVoiceLLMModelDownloaded()) queuedVoiceModelDownloads.push('llm');
    if (queuedVoiceModelDownloads.length > 0) {
      setPendingVoiceModelDownloads(queuedVoiceModelDownloads);
    }

    const payload = {
      queuedModelDownloads,
      queuedVoiceModelDownloads,
      translationModelWifiOnly: translationWifiOnly,
    };

    try {
      await setPatientDataWifiOnly(localPatientDataWifi);
      markDataOnboardingComplete();
      onClose();
      onComplete?.(payload);
    } catch (err) {
      console.warn('[DataSettingsOnboarding] Save failed:', err);
      // Still close — preferences saved to MMKV, API call is best-effort
      markDataOnboardingComplete();
      onClose();
      onComplete?.(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTranslationAction = (
    model: ModelInfo,
    label: string,
    queued: boolean,
    setQueued: (value: boolean) => void,
  ) => {
    const isReady = model.status === 'ready';

    return (
      <View style={[styles.modelActionRow, { borderColor: colors.border }]}>
        <View style={styles.modelActionText}>
          <Text style={[styles.modelActionLabel, { color: colors.text }]}>
            {label}
          </Text>
          <Text style={[styles.modelActionDesc, { color: colors.textSecondary }]}>
            {isReady ? 'Downloaded' : '~75 MB'}
          </Text>
        </View>
        {isReady ? (
          <View style={styles.modelReady}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={[styles.modelReadyText, { color: colors.success }]}>
              Ready
            </Text>
          </View>
        ) : (
          <View style={styles.queueToggleContainer}>
            <Download size={14} color={colors.primary} />
            <Switch
              value={queued}
              onValueChange={setQueued}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        )}
      </View>
    );
  };

  const renderVoiceModelAction = (
    label: string,
    sizeLabel: string,
    isReady: boolean,
    queued: boolean,
    setQueued: (value: boolean) => void,
  ) => {
    return (
      <View style={[styles.modelActionRow, { borderColor: colors.border }]}>
        <View style={styles.modelActionText}>
          <Text style={[styles.modelActionLabel, { color: colors.text }]}>
            {label}
          </Text>
          <Text style={[styles.modelActionDesc, { color: colors.textSecondary }]}>
            {isReady ? 'Downloaded' : sizeLabel}
          </Text>
        </View>
        {isReady ? (
          <View style={styles.modelReady}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={[styles.modelReadyText, { color: colors.success }]}>
              Ready
            </Text>
          </View>
        ) : (
          <View style={styles.queueToggleContainer}>
            <Download size={14} color={colors.primary} />
            <Switch
              value={queued}
              onValueChange={setQueued}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleContinue}
      title="Data Preferences"
      snapPoint={90}
      showHandle={true}
      showCloseButton={false}
    >
      <View style={styles.container}>
        {/* Intro */}
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          This app syncs medical data for offline use. Configure how data is
          downloaded to manage cellular costs.
        </Text>

        {/* Data Size Estimates */}
        <View style={[styles.estimateCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.estimateTitle, { color: colors.text }]}>
            Estimated Download Sizes
          </Text>

          {estimate.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={styles.estimateRow}>
                <View style={styles.estimateLeft}>
                  <Database size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.estimateLabel, { color: colors.text }]}>
                    Patient Data
                  </Text>
                </View>
                <Text style={[styles.estimateValue, { color: colors.textSecondary }]}>
                  {formatBytes(estimate.patientDataBytes)}
                </Text>
              </View>

              <Text style={[styles.estimateDetail, { color: colors.textSecondary }]}>
                {estimate.tableCounts.patients ?? 0} patients, {estimate.tableCounts.notes ?? 0} notes, {estimate.tableCounts.internal_messages ?? 0} messages
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.estimateRow}>
                <View style={styles.estimateLeft}>
                  <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.estimateLabel, { color: colors.text }]}>
                    Photos & Media
                  </Text>
                </View>
                <Text style={[styles.estimateValue, { color: colors.textSecondary }]}>
                  {formatBytes(estimate.mediaBytes)}
                </Text>
              </View>

              <Text style={[styles.estimateDetail, { color: colors.textSecondary }]}>
                {estimate.uncachedPhotoCount} uncached of {estimate.totalPhotoCount} total photos
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.estimateRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>
                  Total
                </Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>
                  {formatBytes(estimate.totalBytes)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Toggles */}
        <View style={styles.toggleSection}>
          <View style={[styles.toggleItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <Database size={20} color={colors.primary} strokeWidth={2} />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Sync Patient Data on WiFi Only
                </Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                  Patients, messages, notes, photos, prescriptions
                </Text>
              </View>
            </View>
            <NetworkModeSwitch
              value={localPatientDataWifi}
              onValueChange={setLocalPatientDataWifi}
            />
          </View>

          <View style={[styles.toggleItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <Languages size={20} color={colors.primary} strokeWidth={2} />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Download AI Models on WiFi Only
                </Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                  Translation and voice dictation models
                </Text>
              </View>
            </View>
            <NetworkModeSwitch
              value={translationWifiOnly}
              onValueChange={setTranslationWifiOnly}
            />
          </View>
        </View>

        <View style={[styles.translationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.translationHeader}>
            <Languages size={18} color={colors.primary} />
            <Text style={[styles.translationTitle, { color: colors.text }]}>
              Offline Translation Models
            </Text>
          </View>
          <Text style={[styles.translationDesc, { color: colors.textSecondary }]}>
            Download Arabic and English models for offline translation.
          </Text>
          <Text style={[styles.translationWarning, { color: colors.textSecondary }]}>
            Selected models download automatically after initial data sync finishes.
          </Text>
          {renderTranslationAction(arEnModel, 'Arabic → English', queueArEnDownload, setQueueArEnDownload)}
          {renderTranslationAction(enArModel, 'English → Arabic', queueEnArDownload, setQueueEnArDownload)}
        </View>

        {FeatureFlags.VOICE_DICTATION && (
          <View style={[styles.translationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.translationHeader}>
              <Mic size={18} color={colors.primary} />
              <Text style={[styles.translationTitle, { color: colors.text }]}>
                Voice Dictation Models
              </Text>
            </View>
            <Text style={[styles.translationDesc, { color: colors.textSecondary }]}>
              Speech recognition uses your device's built-in engine. Download
              optional models for voice prompts and smart extraction.
            </Text>
            <Text style={[styles.translationWarning, { color: colors.textSecondary }]}>
              Selected models download automatically after initial data sync finishes.
            </Text>
            {renderVoiceModelAction(
              'Voice Prompts',
              '~50 MB',
              isVoiceTTSModelDownloaded(),
              queueTTSDownload,
              setQueueTTSDownload,
            )}
            {FeatureFlags.VOICE_DICTATION_LLM && renderVoiceModelAction(
              'Smart Note Extraction',
              '~900 MB',
              isVoiceLLMModelDownloaded(),
              queueLLMDownload,
              setQueueLLMDownload,
            )}
          </View>
        )}

        {/* Tip */}
        <Text style={[styles.tip, { color: colors.textSecondary }]}>
          You can change these settings anytime from your profile.
        </Text>

        {/* Continue Button */}
        <Button
          variant="default"
          onPress={handleContinue}
          disabled={isSaving}
          style={{ marginTop: spacing.md }}
        >
          {isSaving ? <ActivityIndicator color="#fff" size="small" /> : 'Continue'}
        </Button>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  intro: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  estimateCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 8,
  },
  estimateTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimateLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  estimateValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  estimateDetail: {
    fontSize: typography.fontSize.xs,
    marginLeft: 26,
    marginTop: -2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  totalValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  toggleSection: {
    gap: spacing.sm,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  toggleTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  toggleLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  toggleDesc: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  tip: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  translationCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  translationTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  translationDesc: {
    fontSize: typography.fontSize.xs,
  },
  translationWarning: {
    fontSize: typography.fontSize.xs,
  },
  modelActionRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelActionText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modelActionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  modelActionDesc: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  modelReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modelReadyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  queueToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
