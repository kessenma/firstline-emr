// apps/mobile/src/components/patient-chart/messaging/components/TelegramMessageInput.tsx
// Extended message input with image picker and audio recorder

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  Platform,
} from 'react-native';
import { Send, Camera, Mic, Image as ImageIcon, X, Globe, Square } from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useAudioRecorder } from '../../notes/voice-dictation/useAudioRecorder';
import { saveRecordingToFile } from '../../../../utils/audioFileUtils';

type RecordingState = 'idle' | 'recording' | 'processing';

const MAX_RECORDING_MS = 60_000; // 60 seconds
const NUM_LEVEL_BARS = 5;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface TelegramMessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSendText: () => void;
  onSendImage: (uri: string) => void;
  onSendAudio?: (uri: string, duration: number) => void;
  onTranslateAndSend?: () => void;
  showTranslateButton?: boolean;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const TelegramMessageInput: React.FC<TelegramMessageInputProps> = ({
  value,
  onChangeText,
  onSendText,
  onSendImage,
  onSendAudio,
  onTranslateAndSend,
  showTranslateButton = false,
  sending = false,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const colors = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
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
    onSendText();
  };

  // Pick image from gallery
  const handleImagePick = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        console.error('Image picker error:', result.errorMessage);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
        return;
      }

      const uri = result.assets?.[0]?.uri;
      if (uri) {
        const asset = result.assets![0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
          return;
        }
        onSendImage(uri);
        setShowMediaOptions(false);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        cameraType: 'back',
        saveToPhotos: false,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        console.error('Camera error:', result.errorMessage);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
        return;
      }

      const uri = result.assets?.[0]?.uri;
      if (uri) {
        onSendImage(uri);
        setShowMediaOptions(false);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Start audio recording
  const handleStartRecording = useCallback(async () => {
    setShowMediaOptions(false);
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
      console.error('[TelegramMessageInput] Failed to save recording:', err);
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
      {/* Media options */}
      {showMediaOptions && recordingState === 'idle' && (
        <View style={[styles.mediaOptions, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.mediaButton, { backgroundColor: colors.surface }]}
            onPress={handleTakePhoto}
          >
            <Camera size={20} color={colors.primary} />
            <Text style={[styles.mediaButtonText, { color: colors.text }]}>
              Camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mediaButton, { backgroundColor: colors.surface }]}
            onPress={handleImagePick}
          >
            <ImageIcon size={20} color={colors.primary} />
            <Text style={[styles.mediaButtonText, { color: colors.text }]}>
              Gallery
            </Text>
          </TouchableOpacity>

          {onSendAudio && (
            <TouchableOpacity
              style={[styles.mediaButton, { backgroundColor: colors.surface }]}
              onPress={handleStartRecording}
            >
              <Mic size={20} color={colors.primary} />
              <Text style={[styles.mediaButtonText, { color: colors.text }]}>
                Audio
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.closeMediaButton]}
            onPress={() => setShowMediaOptions(false)}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

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
            style={[styles.sendButton, { backgroundColor: colors.error }]}
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
          {/* Media toggle button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: showMediaOptions ? colors.primary : colors.backgroundSecondary,
              },
            ]}
            onPress={() => setShowMediaOptions(!showMediaOptions)}
            disabled={sending || disabled}
          >
            {showMediaOptions ? (
              <X size={20} color={colors.textInverse} />
            ) : (
              <Camera size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Text input */}
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
            multiline
            maxLength={2000}
            editable={!sending && !disabled}
            textAlignVertical="center"
          />

          {/* Translate + Send button */}
          {showTranslateButton && onTranslateAndSend && (
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: canSend ? colors.success || '#22c55e' : colors.border,
                },
              ]}
              onPress={onTranslateAndSend}
              disabled={!canSend}
            >
              <Globe size={20} color={colors.textInverse} />
            </TouchableOpacity>
          )}

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!canSend}
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
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  mediaOptions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  mediaButtonText: {
    fontSize: typography.fontSize.xs,
  },
  closeMediaButton: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
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

export default TelegramMessageInput;
