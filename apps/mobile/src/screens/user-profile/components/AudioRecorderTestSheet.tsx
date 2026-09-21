// Bottom sheet for testing audio recording and playback.
// Uses useAudioRecorder (16kHz mono) + saveRecordingToFile (WAV) + InlineAudioPlayer.
// Shows a live waveform during recording and a static waveform for playback.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Mic, Square, Trash2 } from 'lucide-react-native';
import { formatAudioTime } from '@fajr/shared/media';
import { BottomSheet } from '../../../components/BottomSheet';
import { InlineAudioPlayer } from '../../../components/patient-chart/messaging/components/InlineAudioPlayer';
import { useAudioRecorder } from '../../../components/patient-chart/notes/voice-dictation/useAudioRecorder';
import { saveRecordingToFile } from '../../../utils/audioFileUtils';
import { useVoiceSensitivity } from '../../../hooks/useVoiceSensitivity';
import {
  SENSITIVITY_LABELS,
  SENSITIVITY_DESCRIPTIONS,
  type VoiceSensitivity,
} from '../../../components/patient-chart/notes/voice-dictation/constants';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';

const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_HEIGHT = 40;

interface AudioRecorderTestSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface RecordingResult {
  uri: string;
  durationSeconds: number;
  sizeKB: number;
}

export const AudioRecorderTestSheet: React.FC<AudioRecorderTestSheetProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const { sensitivity, setSensitivity, recorderTuning } = useVoiceSensitivity();
  const {
    isRecording,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useAudioRecorder({ levelBoost: recorderTuning.levelBoost });

  const [isSaving, setIsSaving] = useState(false);
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveformRef = useRef<number[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const stoppingRef = useRef(false);

  // Collect audioLevel snapshots into a growing waveform during recording
  useEffect(() => {
    if (!isRecording) return;
    waveformRef.current.push(audioLevel);
    const snapshot = [...waveformRef.current];
    setLiveWaveform(snapshot);
    // Auto-scroll to the right
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0);
  }, [audioLevel, isRecording]);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setRecording(null);
    waveformRef.current = [];
    setLiveWaveform([]);
    const ok = await startRecording();
    if (!ok) {
      setError('Failed to start recording. Check microphone permissions.');
      return;
    }
    // 60s max
    maxTimerRef.current = setTimeout(() => {
      handleStopRecording();
    }, 60_000);
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    // Ref guard: prevent multiple rapid taps from firing stop twice
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    setIsSaving(true);
    try {
      const samples = await stopRecording();
      if (samples.length === 0) {
        setError('No audio captured');
        return;
      }
      const result = await saveRecordingToFile(samples, 16_000);
      const sizeKB = (44 + samples.length * 2) / 1024;

      setRecording({
        uri: result.uri,
        durationSeconds: result.durationSeconds,
        sizeKB,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording');
    } finally {
      setIsSaving(false);
      stoppingRef.current = false;
    }
  }, [stopRecording]);

  const handleDiscard = useCallback(() => {
    setRecording(null);
    setError(null);
    waveformRef.current = [];
    setLiveWaveform([]);
  }, []);


  return (
    <BottomSheet visible={visible} onClose={onClose} title="Audio Recorder Test">
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Test microphone recording and playback. Records 16kHz mono WAV.
        </Text>

        {/* Mic Sensitivity */}
        <View style={[styles.sensitivityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sensitivityTitle, { color: colors.text }]}>
            Mic Sensitivity
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
                      backgroundColor: isActive ? colors.primary : colors.backgroundSecondary,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSensitivity(level)}
                >
                  <Text
                    style={[
                      styles.sensitivityLabel,
                      { color: isActive ? '#fff' : colors.text },
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

        {/* Error display */}
        {(error || recorderError) && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error || recorderError}
            </Text>
          </View>
        )}

        {/* Live waveform during recording */}
        {isRecording && (
          <View style={[styles.waveformContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.waveformHeader}>
              <View style={styles.recordingLabel}>
                <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.timerText, { color: colors.text }]}>
                  {formatAudioTime(duration)}
                </Text>
              </View>
            </View>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.waveformScroll}
              contentContainerStyle={styles.waveformScrollContent}
            >
              {liveWaveform.map((level, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.max(2, level * WAVEFORM_HEIGHT),
                      backgroundColor: colors.error,
                      opacity: 0.4 + level * 0.6,
                    },
                  ]}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recording controls */}
        <View style={styles.controlsRow}>
          {isRecording ? (
            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: colors.error }]}
              onPress={handleStopRecording}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Square size={20} color="#fff" fill="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: colors.primary }]}
              onPress={handleStartRecording}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Mic size={22} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {!isRecording && !recording && !isSaving && (
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Tap to start recording (60s max)
          </Text>
        )}

        {/* Playback result */}
        {recording && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                Recording
              </Text>
              <TouchableOpacity onPress={handleDiscard} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Trash2 size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <InlineAudioPlayer audioUrl={recording.uri} isSelf={false} />

            <View style={styles.resultMeta}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Format: WAV 16kHz mono 16-bit
              </Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Size: {recording.sizeKB.toFixed(1)} KB
              </Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Duration: {formatAudioTime(recording.durationSeconds)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
  },
  waveformContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  waveformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  waveformScroll: {
    height: WAVEFORM_HEIGHT,
  },
  waveformScrollContent: {
    alignItems: 'center',
    gap: WAVEFORM_BAR_GAP,
    paddingRight: spacing.sm,
  },
  waveformBar: {
    width: WAVEFORM_BAR_WIDTH,
    borderRadius: WAVEFORM_BAR_WIDTH / 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  resultMeta: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.xs,
  },
  sensitivityCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sensitivityTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
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
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  sensitivityHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
});

export default AudioRecorderTestSheet;
