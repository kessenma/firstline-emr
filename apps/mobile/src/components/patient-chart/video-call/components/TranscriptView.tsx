// apps/mobile/src/components/patient-chart/video-call/components/TranscriptView.tsx
//
// Renders a speaker-tagged call transcript.
//
// Shared by the Patient Call note body and the Video section's transcript list
// so the disclaimers can't drift apart between the two — the "not reviewed"
// banner is the whole reason this is safe to put in a chart, and it must be
// impossible to render a transcript without it.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Copy } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import {
  formatSegmentTime,
  MACHINE_TRANSCRIPT_DISCLAIMER,
  UNSUPPORTED_LANGUAGE_DISCLAIMER,
  type PatientCallNoteContent,
  type TranscriptSegment,
} from '../../../../types/notes';

interface TranscriptViewProps {
  content: PatientCallNoteContent;
  patientName?: string;
  /** Hides the copy button where it would be redundant. */
  showCopy?: boolean;
}

function transcriptToPlainText(
  segments: TranscriptSegment[],
  patientName: string,
): string {
  return segments
    .map(s => {
      const who = s.speaker === 'doctor' ? 'Clinician' : patientName;
      return `[${formatSegmentTime(s.startMs)}] ${who}: ${s.text}`;
    })
    .join('\n');
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  content,
  patientName = 'Patient',
  showCopy = true,
}) => {
  const colors = useThemeColors();
  const segments = content.segments ?? [];

  const plainText = useMemo(
    () => transcriptToPlainText(segments, patientName),
    [segments, patientName],
  );

  return (
    <View style={styles.container}>
      {/* Non-negotiable. A machine transcript in a medical record without this
          reads as something a clinician wrote and checked. */}
      <View style={[styles.disclaimer, { backgroundColor: colors.surfaceSecondary }]}>
        <AlertTriangle size={14} color={colors.textSecondary} />
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          {MACHINE_TRANSCRIPT_DISCLAIMER}
        </Text>
      </View>

      {content.languageSupported === false && (
        <View style={[styles.warning, { backgroundColor: colors.warning + '20' }]}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            {UNSUPPORTED_LANGUAGE_DISCLAIMER}
          </Text>
        </View>
      )}

      {content.droppedFrames > 0 && (
        <Text style={[styles.gapNote, { color: colors.textSecondary }]}>
          Some audio was dropped during this call — the transcript may have gaps.
        </Text>
      )}

      {segments.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          No speech was captured during this call.
        </Text>
      ) : (
        <View style={styles.segments}>
          {segments.map((segment, index) => {
            const isDoctor = segment.speaker === 'doctor';
            return (
              <View key={`${segment.speaker}-${segment.startMs}-${index}`} style={styles.segment}>
                <View style={styles.segmentHeader}>
                  <Text
                    style={[
                      styles.speaker,
                      { color: isDoctor ? colors.textSecondary : colors.primary },
                    ]}
                  >
                    {isDoctor ? 'Clinician' : patientName}
                  </Text>
                  <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                    {formatSegmentTime(segment.startMs)}
                  </Text>
                </View>
                <Text style={[styles.text, { color: colors.text }]}>{segment.text}</Text>
              </View>
            );
          })}
        </View>
      )}

      {showCopy && segments.length > 0 && (
        <TouchableOpacity
          style={[styles.copyButton, { borderColor: colors.border }]}
          onPress={() => Clipboard.setString(plainText)}
          activeOpacity={0.7}
        >
          <Copy size={14} color={colors.textSecondary} />
          <Text style={[styles.copyText, { color: colors.textSecondary }]}>
            Copy transcript
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  gapNote: {
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  empty: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  segments: { gap: spacing.sm },
  segment: { gap: 2 },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  speaker: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  text: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  copyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default TranscriptView;
