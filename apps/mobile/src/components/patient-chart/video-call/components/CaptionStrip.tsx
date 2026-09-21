// apps/mobile/src/components/patient-chart/video-call/components/CaptionStrip.tsx
//
// Live captions overlaid on the call stage.
//
// Shows the last few exchanges, not the whole transcript — this is a glance
// surface during a consult, not something to read back. The full text is in the
// Patient Call note afterwards.
//
// Volatile text is dimmed because it is genuinely provisional: the engine
// revises it in place as the speaker continues, and presenting it as settled
// would be misleading in exactly the situation where precision matters.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { TranscriptSegment } from '../../../../native/NativeCallTranscription';

interface CaptionStripProps {
  segments: TranscriptSegment[];
  volatile: Partial<Record<'doctor' | 'patient', TranscriptSegment>>;
  patientName: string;
  /** How many finalized lines to keep on screen. */
  maxLines?: number;
}

// Hard-coded, like the rest of the stage: it renders over black video and must
// not follow the app theme, or it can end up invisible.
const CAPTION_FOREGROUND = '#FFFFFF';
const CAPTION_DIM = 'rgba(255, 255, 255, 0.6)';

export const CaptionStrip: React.FC<CaptionStripProps> = ({
  segments,
  volatile,
  patientName,
  maxLines = 3,
}) => {
  const recent = segments.slice(-maxLines);
  const volatileEntries = (['doctor', 'patient'] as const)
    .map(speaker => volatile[speaker])
    .filter((s): s is TranscriptSegment => !!s);

  if (recent.length === 0 && volatileEntries.length === 0) return null;

  const label = (speaker: 'doctor' | 'patient') =>
    speaker === 'doctor' ? 'You' : patientName;

  return (
    <View style={styles.container} pointerEvents="none">
      {recent.map(segment => (
        <Text
          key={`${segment.speaker}-${segment.startMs}`}
          style={[
            styles.line,
            segment.speaker === 'doctor' ? styles.doctor : styles.patient,
          ]}
          numberOfLines={2}
        >
          <Text style={styles.speaker}>{label(segment.speaker)}: </Text>
          {segment.text}
        </Text>
      ))}

      {volatileEntries.map(segment => (
        <Text
          key={`volatile-${segment.speaker}`}
          style={[
            styles.line,
            styles.volatile,
            segment.speaker === 'doctor' ? styles.doctor : styles.patient,
          ]}
          numberOfLines={2}
        >
          <Text style={styles.speaker}>{label(segment.speaker)}: </Text>
          {segment.text}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    gap: 3,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  line: {
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
    color: CAPTION_FOREGROUND,
  },
  speaker: {
    fontWeight: typography.fontWeight.bold,
  },
  doctor: { textAlign: 'left' },
  patient: { textAlign: 'left' },
  volatile: { color: CAPTION_DIM, fontStyle: 'italic' },
});

export default CaptionStrip;
