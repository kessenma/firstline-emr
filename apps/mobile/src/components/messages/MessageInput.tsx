// apps/mobile/src/components/messages/MessageInput.tsx
// Reusable message input component for mobile messaging

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { Plus, Mic, X, Square, Send } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { useAudioRecorder } from '../patient-chart/notes/voice-dictation/useAudioRecorder';
import { saveRecordingToFile } from '../../utils/audioFileUtils';

type RecordingState = 'idle' | 'recording' | 'processing';

const MAX_RECORDING_MS = 60_000; // 60 seconds
const NUM_LEVEL_BARS = 5;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onSendAudio?: (uri: string, duration: number) => void;
  placeholder?: string;
  sending?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  onPlusPress?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSend,
  onSendAudio,
  placeholder = 'Type a message...',
  sending = false,
  disabled = false,
  maxLength = 2000,
  autoFocus = false,
  onPlusPress,
}) => {
  const colors = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isRecording,
    duration: recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useAudioRecorder();

  const canSend = value.trim().length > 0 && !sending && !disabled;

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording) {
      maxTimerRef.current = setTimeout(() => {
        handleStopRecording();
      }, MAX_RECORDING_MS);
    }
    return () => {
      if (maxTimerRef.current) {
        clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleSend = () => {
    if (!canSend) return;
    onSend();
  };

  const handleSubmitEditing = () => {
    if (canSend) {
      handleSend();
    }
  };

  // Start audio recording
  const handleStartRecording = useCallback(async () => {
    const started = await startRecording();
    if (started) {
      setRecordingState('recording');
    }
  }, [startRecording]);

  // Stop recording and save
  const handleStopRecording = useCallback(async () => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    setRecordingState('processing');
    try {
      const samples = await stopRecording();
      if (samples.length === 0) {
        setRecordingState('idle');
        return;
      }
      const { uri, durationSeconds } = await saveRecordingToFile(samples, 16_000);
      onSendAudio?.(uri, Math.round(durationSeconds));
    } catch (err) {
      console.error('[MessageInput] Failed to save recording:', err);
      Alert.alert('Recording Error', 'Failed to save the recording. Please try again.');
    } finally {
      setRecordingState('idle');
    }
  }, [stopRecording, onSendAudio]);

  // Cancel recording and discard
  const handleCancelRecording = useCallback(async () => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    try {
      await stopRecording();
    } catch {
      // ignore — recorder may already be stopped
    }
    setRecordingState('idle');
  }, [stopRecording]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Recording error */}
      {recorderError && recordingState === 'idle' && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {recorderError}
          </Text>
        </View>
      )}

      {recordingState !== 'idle' ? (
        /* ── Recording mode UI ── */
        <View style={styles.inputRow}>
          {/* Cancel button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleCancelRecording}
            disabled={recordingState === 'processing'}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Recording indicator + timer */}
          <View
            style={[
              styles.recordingIndicator,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {recordingState === 'processing' ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.recordingTimer, { color: colors.textSecondary }]}>
                  Saving...
                </Text>
              </>
            ) : (
              <>
                {/* Pulsing red dot */}
                <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />

                {/* Audio level bars */}
                <View style={styles.levelBarsContainer}>
                  {Array.from({ length: NUM_LEVEL_BARS }).map((_, i) => {
                    const barThreshold = (i + 1) / NUM_LEVEL_BARS;
                    const active = audioLevel >= barThreshold * 0.8;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.levelBar,
                          {
                            height: 6 + i * 4,
                            backgroundColor: active ? colors.error : colors.border + '50',
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                <Text style={[styles.recordingTimer, { color: colors.text }]}>
                  {formatDuration(recordingDuration)}
                </Text>
              </>
            )}
          </View>

          {/* Stop / Send button */}
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: colors.error }]}
            onPress={handleStopRecording}
            disabled={recordingState === 'processing'}
          >
            {recordingState === 'processing' ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Square size={18} color={colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Normal input row ── */
        <View style={styles.inputRow}>
          {onPlusPress && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
              onPress={onPlusPress}
              activeOpacity={0.7}
            >
              <Plus size={20} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={handleSubmitEditing}
            multiline
            maxLength={maxLength}
            editable={!sending && !disabled}
            autoFocus={autoFocus}
            blurOnSubmit={false}
            returnKeyType="default"
            textAlignVertical="center"
          />

          {/* Mic button — only show when text is empty and audio is supported */}
          {onSendAudio && value.trim().length === 0 && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleStartRecording}
              disabled={sending || disabled}
              activeOpacity={0.7}
            >
              <Mic size={20} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Send size={20} color={colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Recording UI
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  levelBarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  levelBar: {
    width: 3,
    borderRadius: 1.5,
  },
  recordingTimer: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
});

export default MessageInput;
