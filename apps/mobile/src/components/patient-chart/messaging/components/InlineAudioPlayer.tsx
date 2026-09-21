// Inline audio player for Telegram message bubbles.
// Uses react-native-audio-api to decode and play audio (supports WAV, MP4, OGG/Opus).
// Generates a real waveform from PCM data.
// Scrubbing via react-native-gesture-handler: tap to seek, drag to scrub.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Play, Square, Loader } from 'lucide-react-native';
import {
  AudioContext,
  AudioManager,
  type AudioBuffer,
  type AudioBufferSourceNode,
} from 'react-native-audio-api';
import { CachesDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { generateWaveform, formatAudioTime, DEFAULT_WAVEFORM_BARS } from '@fajr/shared/media';

interface InlineAudioPlayerProps {
  /** Ready-to-use URL (signed URL, data URI, or file:// path) */
  audioUrl?: string;
  /** Storage path (e.g. "prod/internal-messages-audio/...") — resolved to signed URL on mount */
  mediaPath?: string;
  isSelf?: boolean;
}

const NUM_BARS = DEFAULT_WAVEFORM_BARS;
const WAVEFORM_HEIGHT = 28;
const PLAYHEAD_WIDTH = 2;

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Manual base64 encode — Hermes lacks TypedArray.prototype.buffer */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  const parts: string[] = [];
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    parts.push(
      BASE64_CHARS[a >> 2],
      BASE64_CHARS[((a & 3) << 4) | (b >> 4)],
      i + 1 < len ? BASE64_CHARS[((b & 0x0f) << 2) | (c >> 6)] : '=',
      i + 2 < len ? BASE64_CHARS[c & 0x3f] : '=',
    );
  }
  return parts.join('');
}



export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({
  audioUrl: audioUrlProp,
  mediaPath,
  isSelf = false,
}) => {
  const colors = useThemeColors();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waveformWidth, setWaveformWidth] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  // Resolved URL: either the prop directly, or resolved from mediaPath
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(audioUrlProp);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDraggingRef = useRef(false);
  const dragTimeRef = useRef(0);
  // Refs for gesture worklets (closures in gesture callbacks can be stale)
  const durationRef = useRef(0);
  const waveformWidthRef = useRef(0);

  // Resolve mediaPath to a signed URL if no audioUrl was provided
  useEffect(() => {
    if (audioUrlProp) {
      setResolvedUrl(audioUrlProp);
      return;
    }
    if (!mediaPath) return;

    let cancelled = false;
    (async () => {
      try {
        const { getSignedUrl } = await import('../../../../services/MediaService');
        const url = await getSignedUrl(mediaPath);
        if (!cancelled && url) setResolvedUrl(url);
      } catch {
        // will show error state when user taps play
      }
    })();
    return () => { cancelled = true; };
  }, [audioUrlProp, mediaPath]);

  const audioUrl = resolvedUrl;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when URL changes
  useEffect(() => {
    audioBufferRef.current = null;
    setBars([]);
    setCurrentTime(0);
    setDuration(0);
    durationRef.current = 0;
    setError(null);
  }, [audioUrl]);

  const stopPlayback = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (sourceRef.current) {
      try {
        // Neutralize onEnded before stopping so a stale callback
        // doesn't kill a newly-created source during seek/scrub.
        sourceRef.current.onEnded = () => {};
        sourceRef.current.stop();
      } catch {
        // may already be stopped
      }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const getOrCreateContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const loadAudio = useCallback(async (): Promise<AudioBuffer | null> => {
    if (audioBufferRef.current) return audioBufferRef.current;
    if (!audioUrl) {
      setError('Audio not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ctx = getOrCreateContext();
      const isLocal = audioUrl.startsWith('file://') || audioUrl.startsWith('/');
      let buffer: AudioBuffer;
      if (isLocal) {
        buffer = await ctx.decodeAudioDataSource(audioUrl);
      } else {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        try {
          buffer = await ctx.decodeAudioData(arrayBuffer);
        } catch {
          // Fallback: if in-memory decode fails (e.g. WebM/Opus), save to a
          // temp file with .m4a extension so the native file-path decoder
          // routes it through FFmpeg which supports more formats.
          const bytes = new Uint8Array(arrayBuffer);
          const tmpPath = CachesDirectoryPath + '/audio_tmp_' + Date.now() + '.m4a';
          await writeFile(tmpPath, uint8ArrayToBase64(bytes), 'base64');
          buffer = await ctx.decodeAudioDataSource(tmpPath);
        }
      }

      audioBufferRef.current = buffer;
      setDuration(buffer.duration);
      durationRef.current = buffer.duration;

      // Generate real waveform from PCM data
      try {
        const pcm = buffer.getChannelData(0);
        setBars(generateWaveform(pcm, NUM_BARS));
      } catch {
        setBars(new Array(NUM_BARS).fill(0.3));
      }

      return buffer;
    } catch (err) {
      console.error('[InlineAudioPlayer] Failed to decode audio:', err);
      setError('Cannot play this audio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [audioUrl, getOrCreateContext]);

  /** Start or restart playback from a specific offset in seconds. */
  const playFromOffset = useCallback(
    async (offsetSeconds: number) => {
      stopPlayback();

      const buffer = await loadAudio();
      if (!buffer) return;

      const clampedOffset = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.05));

      const ctx = getOrCreateContext();

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Route audio through loudspeaker instead of earpiece
      try {
        AudioManager.setAudioSessionOptions({
          iosCategory: 'playback',
          iosMode: 'default',
          iosOptions: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP'],
        });
      } catch {
        // best effort
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      sourceRef.current = source;

      source.onEnded = () => {
        stopPlayback();
        setCurrentTime(0);
        playbackOffsetRef.current = 0;
      };

      playbackOffsetRef.current = clampedOffset;
      startTimeRef.current = ctx.currentTime;
      source.start(0, clampedOffset);
      setIsPlaying(true);
      setCurrentTime(clampedOffset);

      progressTimerRef.current = setInterval(() => {
        if (audioContextRef.current && !isDraggingRef.current) {
          const elapsed =
            audioContextRef.current.currentTime -
            startTimeRef.current +
            clampedOffset;
          setCurrentTime(Math.min(elapsed, buffer.duration));
        }
      }, 100);
    },
    [stopPlayback, loadAudio, getOrCreateContext],
  );

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    await playFromOffset(0);
  }, [isPlaying, stopPlayback, playFromOffset]);

  // --- Layout ---

  const handleWaveformLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWaveformWidth(w);
    waveformWidthRef.current = w;
  }, []);

  // --- Scrubbing callbacks (called from gesture worklets via runOnJS) ---

  const onScrubStart = useCallback(() => {
    isDraggingRef.current = true;
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const onScrubUpdate = useCallback((x: number) => {
    const width = waveformWidthRef.current;
    const dur = durationRef.current;
    if (width <= 0 || dur <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / width));
    const seekTime = ratio * dur;
    dragTimeRef.current = seekTime;
    setCurrentTime(seekTime);
  }, []);

  const onScrubEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    playFromOffset(dragTimeRef.current);
  }, [playFromOffset]);

  const onTapSeek = useCallback(
    (x: number) => {
      const width = waveformWidthRef.current;
      const dur = durationRef.current;
      if (width <= 0 || dur <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / width));
      playFromOffset(ratio * dur);
    },
    [playFromOffset],
  );

  // --- RNGH gestures ---

  const panGesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .onStart((e) => {
      'worklet';
      runOnJS(onScrubStart)();
      runOnJS(onScrubUpdate)(e.x);
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(onScrubUpdate)(e.x);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(onScrubEnd)();
    });

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      runOnJS(onTapSeek)(e.x);
    });

  const scrubGesture = Gesture.Exclusive(panGesture, tapGesture);

  // --- Colors ---

  // Use theme-aware colors that work on both light and dark bubble backgrounds.
  // isSelf bubbles use colors.primary as background — use textInverse for contrast.
  const textColor = isSelf ? colors.textInverse : colors.text;
  const secondaryColor = isSelf ? colors.textInverse + '99' : colors.textSecondary;
  const barColor = isSelf ? colors.textInverse + '40' : colors.primary + '40';
  const barActiveColor = isSelf ? colors.textInverse + 'CC' : colors.primary;
  const playheadColor = isSelf ? colors.textInverse : colors.text;
  const buttonBg = isSelf ? colors.textInverse + '30' : colors.primary;

  const progress = duration > 0 ? currentTime / duration : 0;
  const playheadLeft = waveformWidth * progress;
  const displayBars = bars.length > 0 ? bars : new Array(NUM_BARS).fill(0.15);

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.errorText, { color: secondaryColor }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Play/Stop button */}
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: buttonBg }]}
        onPress={handlePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader size={16} color={colors.textInverse} />
        ) : isPlaying ? (
          <Square
            size={14}
            color={colors.textInverse}
            fill={colors.textInverse}
          />
        ) : (
          <Play
            size={16}
            color={colors.textInverse}
            fill={colors.textInverse}
          />
        )}
      </TouchableOpacity>

      {/* Waveform + playhead — gesture-based scrubbing */}
      <View style={styles.audioInfo}>
        <GestureDetector gesture={scrubGesture}>
          <View style={styles.scrubArea} onLayout={handleWaveformLayout}>
            <View style={styles.waveformRow}>
              {displayBars.map((height, i) => {
                const barProgress = (i + 0.5) / displayBars.length;
                const isActive = barProgress <= progress;
                return (
                  <View
                    key={i}
                    style={[
                      styles.waveformBar,
                      {
                        height: WAVEFORM_HEIGHT * height,
                        backgroundColor: isActive ? barActiveColor : barColor,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Vertical playhead line */}
            {duration > 0 && waveformWidth > 0 && (
              <View
                style={[
                  styles.playhead,
                  {
                    left: playheadLeft - PLAYHEAD_WIDTH / 2,
                    backgroundColor: playheadColor,
                  },
                ]}
                pointerEvents="none"
              >
                <View
                  style={[
                    styles.playheadThumb,
                    { backgroundColor: playheadColor },
                  ]}
                />
              </View>
            )}
          </View>
        </GestureDetector>

        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: textColor }]}>Voice Message</Text>
          <Text style={[styles.timeLabel, { color: secondaryColor }]}>
            {isPlaying || currentTime > 0
              ? formatAudioTime(currentTime)
              : duration > 0
                ? formatAudioTime(duration)
                : ''}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
    gap: 4,
  },
  scrubArea: {
    paddingVertical: 10,
    position: 'relative',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: WAVEFORM_HEIGHT,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 1.5,
    minWidth: 2,
  },
  playhead: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: PLAYHEAD_WIDTH,
    borderRadius: PLAYHEAD_WIDTH / 2,
  },
  playheadThumb: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  timeLabel: {
    fontSize: typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
});

export default InlineAudioPlayer;
