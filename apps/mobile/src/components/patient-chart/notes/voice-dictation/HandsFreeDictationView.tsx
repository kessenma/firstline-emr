// Hands-Free tab: fully voice-guided flow.
// One tap to start, zero taps after. TTS prompts, silence auto-stop.

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Mic, Check, X, Volume2, AudioLines } from 'lucide-react-native';
import { useLLM } from 'react-native-executorch';
import { Button } from '../../../ui/Button';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { isVoiceLLMModelDownloaded } from '../../../../hooks/useVoiceDictationModels';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import {
  useHandsFreeDictation,
  FIELD_ORDER,
  FIELD_LABELS,
  TRIGGER_WORDS,
} from './useHandsFreeDictation';
import { LLM_MODEL } from './constants';
import { useProofreadingSuggestions } from './useProofreadingSuggestions';
import { ProofreadingSuggestionCard } from './ProofreadingSuggestionCard';
import { TriggerWordIndicator } from './TriggerWordIndicator';
import type { DictationResult } from './useVoiceDictation';

const NUM_LEVEL_BARS = 5;

interface HandsFreeDictationViewProps {
  onFieldsReady: (fields: DictationResult) => void;
}

export const HandsFreeDictationView: React.FC<HandsFreeDictationViewProps> = ({
  onFieldsReady,
}) => {
  const colors = useThemeColors();
  const hf = useHandsFreeDictation();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // LLM proofreading — only active in review state
  const llmAvailable = isVoiceLLMModelDownloaded();
  const llm = useLLM({ model: LLM_MODEL, preventLoad: !llmAvailable });
  const proofreading = useProofreadingSuggestions(llm.generate, llm.isReady);

  // Auto-trigger proofreading for all fields when entering review
  useEffect(() => {
    if (hf.state === 'review' && proofreading.isAvailable) {
      for (const field of FIELD_ORDER) {
        if (hf.fieldValues[field].trim()) {
          proofreading.proofreadField(field, hf.fieldValues[field]);
        }
      }
    }
    // Only fire when entering review state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hf.state]);

  useEffect(() => {
    if (hf.state !== 'listening') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(1);
    };
  }, [hf.state, pulseAnim]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFillNote = () => {
    onFieldsReady(hf.getResult());
    hf.reset();
  };

  if (!hf.isSTTReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking speech recognition...
        </Text>
      </View>
    );
  }

  // Idle state — show start button
  if (hf.state === 'idle') {
    return (
      <View style={styles.idleContainer}>
        {hf.error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.error + '15' },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.error }]}>
              {hf.error}
            </Text>
          </View>
        )}

        <View style={styles.idleContent}>
          <Volume2 size={48} color={colors.primary} strokeWidth={1.5} />
          <Text style={[styles.idleTitle, { color: colors.text }]}>
            Hands-Free Dictation
          </Text>
          <Text style={[styles.idleDesc, { color: colors.textSecondary }]}>
            Tap Start and the app will guide you through each field with voice
            prompts. Speak naturally — recording stops automatically after a
            pause.
          </Text>

          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={hf.start}
            activeOpacity={0.7}
          >
            <Mic size={24} color={colors.textInverse} />
            <Text style={[styles.startButtonText, { color: colors.textInverse }]}>Start Dictation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Active flow (prompting / listening with live transcript)
  if (hf.state === 'prompting' || hf.state === 'listening') {
    const displayText = hf.state === 'listening' && hf.liveTranscript
      ? hf.liveTranscript
      : hf.fieldValues[hf.currentField];

    return (
      <View style={styles.activeContainer}>
        {/* Status indicator */}
        <View style={styles.statusRow}>
          {hf.state === 'prompting' && (
            <>
              <Volume2 size={20} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>
                Speaking...
              </Text>
            </>
          )}
          {hf.state === 'listening' && (
            <>
              <Animated.View
                style={[
                  styles.recordingIconWrap,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <AudioLines size={22} color={colors.error} strokeWidth={2.3} />
              </Animated.View>
              <Text style={[styles.statusText, { color: colors.error }]}>
                Listening...
              </Text>
              <Text style={[styles.durationText, { color: colors.text }]}>
                {formatDuration(hf.duration)}
              </Text>
            </>
          )}
        </View>

        {/* Current field */}
        <Text style={[styles.currentFieldLabel, { color: colors.text }]}>
          {FIELD_LABELS[hf.currentField]}
        </Text>

        {/* Audio level bars — visible during listening */}
        {hf.state === 'listening' && (
          <View style={styles.levelBarsRow}>
            {(() => {
              const visualLevel = hf.audioLevel > 0 ? hf.audioLevel : 0.18;
              return Array.from({ length: NUM_LEVEL_BARS }).map((_, i) => {
                const barThreshold = (i + 1) / NUM_LEVEL_BARS;
                const active = visualLevel >= barThreshold * 0.8;
                return (
                  <View
                    key={i}
                    style={[
                      styles.levelBar,
                      {
                        height: 8 + i * 6,
                        backgroundColor: active ? colors.error : colors.border + '50',
                      },
                    ]}
                  />
                );
              });
            })()}
          </View>
        )}

        {/* Progress indicators */}
        <View style={styles.progressRow}>
          {FIELD_ORDER.map((field) => (
            <View
              key={field}
              style={[
                styles.progressItem,
                {
                  backgroundColor: hf.completedFields.has(field)
                    ? colors.success + '20'
                    : field === hf.currentField
                    ? colors.primary + '20'
                    : colors.border + '40',
                  borderColor: hf.completedFields.has(field)
                    ? colors.success
                    : field === hf.currentField
                    ? colors.primary
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: hf.completedFields.has(field)
                      ? colors.success
                      : field === hf.currentField
                      ? colors.primary
                      : colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {FIELD_LABELS[field]}
              </Text>
            </View>
          ))}
        </View>

        {/* Live transcript / captured text */}
        {displayText.length > 0 && (
          <View
            style={[
              styles.capturedBox,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: hf.state === 'listening' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.capturedLabel, { color: colors.textSecondary }]}>
              {hf.state === 'listening' ? 'Live:' : 'Captured:'}
            </Text>
            <Text style={[styles.capturedText, { color: colors.text }]}>
              {displayText}
            </Text>

            {/* Trigger word indicator */}
            {hf.detectedTriggerWords[hf.currentField] && (
              <TriggerWordIndicator
                triggerWord={hf.detectedTriggerWords[hf.currentField]!}
                onDismiss={() => hf.dismissTriggerWord(hf.currentField)}
              />
            )}
          </View>
        )}

        {/* Trigger word hint — show during listening */}
        {hf.state === 'listening' && (
          <View style={[styles.triggerHint, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.triggerHintText, { color: colors.textSecondary }]}>
              Say{' '}
              {TRIGGER_WORDS.slice(0, 3).map((w, i) => (
                <Text key={w} style={{ fontWeight: '700', color: colors.text }}>
                  {i > 0 ? ', ' : ''}"{w}"
                </Text>
              ))}
              {' '}to advance  —  or pause to auto-advance
            </Text>
          </View>
        )}

        {/* Cancel button */}
        <View style={styles.cancelContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={hf.cancel}
          >
            <X size={16} color={colors.textSecondary} />
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Review state — show all captured fields for editing
  return (
    <View style={styles.reviewContainer}>
      <Text style={[styles.reviewTitle, { color: colors.text }]}>
        Review & Edit
      </Text>
      <Text style={[styles.reviewDesc, { color: colors.textSecondary }]}>
        Edit any fields below, then tap Fill Note to finish.
      </Text>

      <ScrollView
        style={styles.reviewScroll}
        contentContainerStyle={styles.reviewScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {FIELD_ORDER.map((field) => (
          <View key={field} style={styles.reviewField}>
            <Text style={[styles.reviewFieldLabel, { color: colors.text }]}>
              {FIELD_LABELS[field]}
            </Text>
            <TextInput
              style={[
                styles.reviewInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              value={hf.fieldValues[field]}
              onChangeText={(text) => {
                hf.setFieldValue(field, text);
                proofreading.invalidateField(field);
              }}
              placeholder="(empty)"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            {/* Trigger word indicator */}
            {hf.detectedTriggerWords[field] && (
              <TriggerWordIndicator
                triggerWord={hf.detectedTriggerWords[field]!}
                onDismiss={() => hf.dismissTriggerWord(field)}
              />
            )}

            {/* LLM proofreading suggestions */}
            {proofreading.isAvailable && (
              <ProofreadingSuggestionCard
                suggestions={proofreading.suggestions[field]}
                status={proofreading.statusByField[field]}
                onAccept={suggestion => {
                  const newText = proofreading.acceptSuggestion(
                    suggestion.id,
                    hf.fieldValues[field],
                  );
                  hf.setFieldValue(field, newText);
                }}
                onDismiss={id => proofreading.dismissSuggestion(id)}
                onAcceptAll={() => {
                  const newText = proofreading.acceptAllForField(
                    field,
                    hf.fieldValues[field],
                  );
                  hf.setFieldValue(field, newText);
                }}
                onDismissAll={() => proofreading.dismissAllForField(field)}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="default" onPress={handleFillNote} style={styles.fillButton}>
          <View style={styles.buttonInner}>
            <Check size={18} color={colors.textInverse} />
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>Fill Note</Text>
          </View>
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  // Idle
  idleContainer: {
    flex: 1,
  },
  idleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  idleTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  idleDesc: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  startButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  // Error
  errorBanner: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  // Active flow
  activeContainer: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  recordingIconWrap: {
    marginRight: 2,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  durationText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.sm,
  },
  currentFieldLabel: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  progressItem: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  levelBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  levelBar: {
    width: 8,
    borderRadius: 4,
  },
  capturedBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing.sm,
  },
  capturedLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  capturedText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  triggerHint: {
    marginHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  triggerHintText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  cancelContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  cancelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  // Review
  reviewContainer: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  reviewDesc: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  reviewScroll: {
    flex: 1,
  },
  reviewScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  reviewField: {
    gap: 4,
  },
  reviewFieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  reviewInput: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  footer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  fillButton: {
    width: '100%',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
