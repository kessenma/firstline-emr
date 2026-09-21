// Guided tab: per-field form with global recording toggle + Next/Back navigation.
// Doctor taps record once, navigates freely between fields while dictating.
// Live streaming transcript shows words appearing in real-time.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Mic, MicOff, ChevronLeft, ChevronRight, Save, FilePlus2, Trash2, ArrowDownToLine, ArrowUpToLine } from 'lucide-react-native';
import { useLLM } from 'react-native-executorch';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { isVoiceLLMModelDownloaded } from '../../../../hooks/useVoiceDictationModels';
import { Tooltip } from '../../../ui/Tooltip';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import {
  useFieldDictation,
  DICTATION_FIELDS,
  type DictationMode,
} from './useFieldDictation';
import { LLM_MODEL } from './constants';
import { useProofreadingSuggestions } from './useProofreadingSuggestions';
import { ProofreadingSuggestionCard } from './ProofreadingSuggestionCard';
import { TriggerWordIndicator } from './TriggerWordIndicator';
import type { DictationResult } from './useVoiceDictation';

const NUM_LEVEL_BARS = 5;

interface GuidedDictationViewProps {
  onFieldsReady: (fields: DictationResult) => void;
  onSaveDraft: (fields: DictationResult) => void;
  /** Publish note directly without opening NoteCreationSheet */
  onPublish?: (fields: DictationResult) => void;
  /** Pre-fill fields with existing content (e.g. from a draft note) */
  initialContent?: DictationResult;
}

export const GuidedDictationView: React.FC<GuidedDictationViewProps> = ({
  onFieldsReady,
  onSaveDraft,
  onPublish,
  initialContent,
}) => {
  const colors = useThemeColors();
  const fd = useFieldDictation({ initialValues: initialContent });

  // LLM proofreading — reuses the same model as Smart Note Extraction
  const llmAvailable = isVoiceLLMModelDownloaded();
  const llm = useLLM({ model: LLM_MODEL, preventLoad: !llmAvailable });
  const proofreading = useProofreadingSuggestions(llm.generate, llm.isReady);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePublish = () => {
    const handler = onPublish ?? onFieldsReady;
    handler(fd.getResult());
    fd.reset();
  };

  const handleSaveDraft = () => {
    onSaveDraft(fd.getResult());
    fd.reset();
  };

  // React to "save draft" trigger word from voice command
  useEffect(() => {
    if (fd.saveDraftRequested) {
      fd.clearSaveDraftRequested();
      handleSaveDraft();
    }
  }, [fd.saveDraftRequested]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showPublishTooltip, setShowPublishTooltip] = useState(false);

  const hasAnyContent = DICTATION_FIELDS.some(
    f => fd.fieldValues[f.key].trim().length > 0,
  );
  const allFieldsFilled = DICTATION_FIELDS.every(
    f => fd.fieldValues[f.key].trim().length > 0,
  );

  const isFirstField = fd.currentFieldIndex === 0;
  const isLastField = fd.currentFieldIndex === DICTATION_FIELDS.length - 1;

  if (!fd.isSTTReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking speech recognition...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {fd.error && (
        <View
          style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            {fd.error}
          </Text>
        </View>
      )}

      {/* Global recording toggle + field indicator */}
      <View style={[styles.recordingBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.recordToggle,
            {
              backgroundColor: fd.isListening ? colors.error : colors.primary,
            },
          ]}
          onPress={fd.toggleRecording}
          activeOpacity={0.7}
        >
          {fd.isListening ? (
            <MicOff size={20} color={colors.textInverse} />
          ) : (
            <Mic size={20} color={colors.textInverse} />
          )}
          <Text style={[styles.recordToggleText, { color: colors.textInverse }]}>
            {fd.isListening ? 'Stop' : 'Record'}
          </Text>
        </TouchableOpacity>

        {fd.isListening && (
          <Text style={[styles.durationBadge, { color: colors.error }]}>
            {formatDuration(fd.duration)}
          </Text>
        )}

        <Text style={[styles.fieldIndicatorCenter, { color: colors.textSecondary }]}>
          {fd.currentFieldIndex + 1} / {DICTATION_FIELDS.length}
        </Text>
      </View>

      {/* Audio level bars — visible while recording */}
      {fd.isListening && (
        <View style={styles.levelBarsRow}>
          {Array.from({ length: NUM_LEVEL_BARS }).map((_, i) => {
            const barThreshold = (i + 1) / NUM_LEVEL_BARS;
            const active = (fd.audioLevel || 0.18) >= barThreshold * 0.8;
            return (
              <View
                key={i}
                style={[
                  styles.levelBar,
                  {
                    height: 6 + i * 4,
                    backgroundColor: active
                      ? colors.error
                      : colors.border + '50',
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {DICTATION_FIELDS.map(({ key, label }, index) => {
          const isActive = index === fd.currentFieldIndex;
          const value = fd.fieldValues[key];
          const showLiveTranscript = isActive && fd.isListening && fd.liveTranscript;
          const fieldHasInitialContent = !!(initialContent?.[key]?.trim());

          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => fd.goToField(index)}
              style={[
                styles.fieldCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isActive
                    ? fd.isListening
                      ? colors.error
                      : colors.primary
                    : colors.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              {/* Field header */}
              <View style={styles.fieldHeader}>
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color: isActive ? colors.text : colors.textSecondary,
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                >
                  {label}
                </Text>
                {isActive && fd.isListening && (
                  <View style={[styles.liveBadge, { backgroundColor: colors.error }]}>
                    <Text style={[styles.liveBadgeText, { color: colors.textInverse }]}>LIVE</Text>
                  </View>
                )}
              </View>

              {/* Dictation mode selector — per-field, only for fields with existing draft content */}
              {fieldHasInitialContent && (
                <View style={styles.fieldModeBar}>
                  {([
                    { mode: 'clear' as DictationMode, label: 'Clear', Icon: Trash2 },
                    { mode: 'append' as DictationMode, label: 'Append', Icon: ArrowDownToLine },
                    { mode: 'prepend' as DictationMode, label: 'Insert', Icon: ArrowUpToLine },
                  ]).map(({ mode, label: modeLabel, Icon }) => {
                    const isModeActive = fd.dictationMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modeChip,
                          {
                            backgroundColor: isModeActive ? colors.primary : 'transparent',
                            borderColor: isModeActive ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => fd.setDictationMode(mode)}
                        activeOpacity={0.7}
                      >
                        <Icon size={12} color={isModeActive ? colors.textInverse : colors.textSecondary} />
                        <Text
                          style={[
                            styles.modeChipText,
                            { color: isModeActive ? colors.textInverse : colors.textSecondary },
                          ]}
                        >
                          {modeLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Live transcript preview (while dictating this field) */}
              {showLiveTranscript && (
                <Text
                  style={[styles.liveTranscript, { color: colors.primary }]}
                  numberOfLines={3}
                >
                  {fd.liveTranscript}
                </Text>
              )}

              {/* Field input */}
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={value}
                onChangeText={text => {
                  fd.setFieldValue(key, text);
                  proofreading.invalidateField(key);
                }}
                placeholder={
                  isActive && fd.isListening
                    ? 'Dictating...'
                    : 'Tap to type or select field and record'
                }
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
              />

              {/* Trigger word indicator */}
              {fd.detectedTriggerWords[key] && (
                <TriggerWordIndicator
                  triggerWord={fd.detectedTriggerWords[key]!}
                  onDismiss={() => fd.dismissTriggerWord(key)}
                />
              )}

              {/* LLM proofreading suggestions */}
              {proofreading.isAvailable && (
                <ProofreadingSuggestionCard
                  suggestions={proofreading.suggestions[key]}
                  status={proofreading.statusByField[key]}
                  onAccept={suggestion => {
                    const newText = proofreading.acceptSuggestion(
                      suggestion.id,
                      fd.fieldValues[key],
                    );
                    fd.setFieldValue(key, newText);
                  }}
                  onDismiss={id => proofreading.dismissSuggestion(id)}
                  onAcceptAll={() => {
                    const newText = proofreading.acceptAllForField(
                      key,
                      fd.fieldValues[key],
                    );
                    fd.setFieldValue(key, newText);
                  }}
                  onDismissAll={() => proofreading.dismissAllForField(key)}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Trigger word hint — visible when recording */}
      {fd.isListening && (
        <View style={[styles.triggerHint, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.triggerHintText, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: colors.text }}>"next"</Text> advance{'  '}
            <Text style={{ fontWeight: '700', color: colors.text }}>"stop"</Text> pause{'  '}
            <Text style={{ fontWeight: '700', color: colors.text }}>"redo"</Text> restart field{'  '}
            <Text style={{ fontWeight: '700', color: colors.text }}>"save draft"</Text> save
          </Text>
        </View>
      )}

      {/* Sticky bottom bar: Save Draft + Back / Next */}
      <View style={[styles.stickyBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {/* Top row: Save Draft + Fill Note */}
        {!fd.isListening && hasAnyContent && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.saveDraftButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={handleSaveDraft}
              activeOpacity={0.7}
            >
              <Save size={18} color={colors.text} />
              <FilePlus2 size={18} color={colors.text} />
            </TouchableOpacity>

            <Tooltip
              tooltipText="Complete all fields before publishing"
              showTooltip={showPublishTooltip}
              position="top"
              maxWidth={220}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={[
                  styles.publishButton,
                  { backgroundColor: allFieldsFilled ? colors.primary : colors.border + '60' },
                ]}
                onPress={() => {
                  if (allFieldsFilled) {
                    setShowPublishTooltip(false);
                    handlePublish();
                  } else {
                    setShowPublishTooltip(true);
                    setTimeout(() => setShowPublishTooltip(false), 2500);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.publishButtonText,
                    { color: allFieldsFilled ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  Publish
                </Text>
              </TouchableOpacity>
            </Tooltip>
          </View>
        )}

        {/* Bottom row: Back / field indicator / Next */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor: isFirstField ? colors.border + '40' : colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
            onPress={fd.prevField}
            disabled={isFirstField}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={22}
              color={isFirstField ? colors.textSecondary + '60' : colors.text}
            />
            <Text
              style={[
                styles.navButtonText,
                { color: isFirstField ? colors.textSecondary + '60' : colors.text },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>

          <Text style={[styles.fieldIndicatorCenter, { color: colors.textSecondary }]}>
            {fd.currentFieldIndex + 1} / {DICTATION_FIELDS.length}
          </Text>

          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor: isLastField ? colors.border + '40' : colors.primary,
                borderColor: isLastField ? colors.border : colors.primary,
              },
            ]}
            onPress={fd.nextField}
            disabled={isLastField}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navButtonText,
                { color: isLastField ? colors.textSecondary + '60' : colors.textInverse },
              ]}
            >
              Next
            </Text>
            <ChevronRight
              size={22}
              color={isLastField ? colors.textSecondary + '60' : colors.textInverse}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  errorBanner: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  fieldModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  modeChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  recordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  recordToggleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  durationBadge: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  levelBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 28,
    marginBottom: spacing.sm,
  },
  levelBar: {
    width: 6,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  fieldCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveTranscript: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  fieldInput: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  triggerHint: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  triggerHintText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  stickyBar: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveDraftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  publishButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  publishButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 4,
    minWidth: 90,
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  fieldIndicatorCenter: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
