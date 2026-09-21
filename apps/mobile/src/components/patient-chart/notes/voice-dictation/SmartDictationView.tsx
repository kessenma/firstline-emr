// Smart tab: single free-form recording + LLM extraction.
// Record everything at once, then AI extracts structured fields.

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { Mic, MicOff, Check, Type } from 'lucide-react-native';
import { Button } from '../../../ui/Button';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useVoiceDictation, type DictationResult } from './useVoiceDictation';
import { useProcedureExtraction } from './useProcedureExtraction';

interface SmartDictationViewProps {
  onFieldsReady: (fields: DictationResult) => void;
}

export const SmartDictationView: React.FC<SmartDictationViewProps> = ({
  onFieldsReady,
}) => {
  const colors = useThemeColors();
  const vm = useVoiceDictation();
  const extraction = useProcedureExtraction();

  // Force smart mode
  useEffect(() => {
    vm.setMode('smart');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When entering 'extracting' state, run LLM extraction
  useEffect(() => {
    if (vm.state === 'extracting' && extraction.isReady) {
      extraction
        .extractFields(vm.editableTranscript)
        .then((fields) => vm.setExtractionResult(fields))
        .catch(() => vm.extractionFailed());
    }
  }, [vm.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // When dictation is done, emit result
  useEffect(() => {
    if (vm.state === 'done') {
      onFieldsReady(vm.result);
      setTimeout(() => vm.reset(), 300);
    }
  }, [vm.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!vm.isSTTReady && vm.state === 'idle') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Speech recognition unavailable on this device.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Error */}
      {vm.error && (
        <View
          style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            {vm.error}
          </Text>
        </View>
      )}

      {/* Idle / Recording */}
      {(vm.state === 'idle' || vm.state === 'recording') && vm.isSTTReady && (
        <View style={styles.recordingView}>
          <Text style={[styles.phaseLabel, { color: colors.textSecondary }]}>
            Describe the procedure freely
          </Text>
          <Text style={[styles.phaseHint, { color: colors.textSecondary }]}>
            Include procedure name, diagnosis, notes, and plan. AI will extract
            the fields automatically.
          </Text>

          <View style={styles.micContainer}>
            <TouchableOpacity
              style={[
                styles.micButton,
                {
                  backgroundColor:
                    vm.state === 'recording' ? colors.error : colors.primary,
                },
              ]}
              onPress={
                vm.state === 'recording'
                  ? vm.stopRecording
                  : vm.startRecording
              }
              activeOpacity={0.7}
            >
              {vm.state === 'recording' ? (
                <MicOff size={48} color={colors.textInverse} strokeWidth={1.5} />
              ) : (
                <Mic size={48} color={colors.textInverse} strokeWidth={1.5} />
              )}
            </TouchableOpacity>

            {vm.state === 'recording' && (
              <Text style={[styles.durationText, { color: colors.text }]}>
                {formatDuration(vm.duration)}
              </Text>
            )}

            <Text style={[styles.micHint, { color: colors.textSecondary }]}>
              {vm.state === 'recording'
                ? 'Tap to stop recording'
                : 'Tap to start recording'}
            </Text>
          </View>
        </View>
      )}

      {/* Reviewing */}
      {vm.state === 'reviewing' && (
        <View style={styles.reviewView}>
          <Text style={[styles.reviewLabel, { color: colors.text }]}>
            Transcript
          </Text>
          <Text style={[styles.reviewHint, { color: colors.textSecondary }]}>
            Review and edit if needed, then continue.
          </Text>

          <ScrollView
            style={[styles.transcriptScroll, { borderColor: colors.border }]}
            contentContainerStyle={styles.transcriptScrollContent}
          >
            <TextInput
              style={[styles.transcriptInput, { color: colors.text }]}
              value={vm.editableTranscript}
              onChangeText={vm.setEditableTranscript}
              multiline
              textAlignVertical="top"
              autoFocus={false}
            />
          </ScrollView>

          <View style={styles.reviewActions}>
            <Button
              variant="default"
              onPress={vm.acceptTranscript}
              style={styles.actionButton}
            >
              <View style={styles.buttonInner}>
                <Text style={[styles.buttonText, { color: colors.textInverse }]}>Auto-fill Fields</Text>
                <Check size={18} color={colors.textInverse} />
              </View>
            </Button>
            <Button
              variant="outline"
              onPress={vm.useAsNotes}
              style={styles.actionButton}
            >
              <View style={styles.buttonInner}>
                <Type size={16} color={colors.text} />
                <Text
                  style={[styles.buttonTextOutline, { color: colors.text }]}
                >
                  Use as Notes
                </Text>
              </View>
            </Button>
          </View>
        </View>
      )}

      {/* Extracting */}
      {vm.state === 'extracting' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Extracting procedure fields...
          </Text>
          <Text
            style={[styles.loadingSubtext, { color: colors.textSecondary }]}
          >
            AI is parsing your dictation into structured fields.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
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
  loadingSubtext: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorBanner: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  recordingView: {
    flex: 1,
    gap: spacing.md,
  },
  phaseLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  phaseHint: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  micContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  durationText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  micHint: {
    fontSize: typography.fontSize.sm,
  },
  reviewView: {
    flex: 1,
    gap: spacing.sm,
  },
  reviewLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  reviewHint: {
    fontSize: typography.fontSize.sm,
  },
  transcriptScroll: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 150,
  },
  transcriptScrollContent: {
    padding: spacing.md,
  },
  transcriptInput: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    minHeight: 150,
  },
  reviewActions: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  actionButton: {
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
  buttonTextOutline: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
