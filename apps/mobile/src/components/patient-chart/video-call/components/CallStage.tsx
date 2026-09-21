// apps/mobile/src/components/patient-chart/video-call/components/CallStage.tsx
//
// The full-size call surface: remote video filling the frame with the local
// camera as a picture-in-picture tile.
//
// Only mounted when the sheet is above the minimized snap point — the session
// unmounts it at index 0 so exactly one video surface is bound to the remote
// track at a time (the header thumbnail takes over).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import { BarVisualizer, VideoTrack } from '@livekit/react-native';
import { VideoOff, UserRound, Maximize2, Minimize2 } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useVideoCallSession } from '../VideoCallSessionProvider';
import { useCallTracks } from '../hooks/useCallTracks';
import { CaptionStrip } from './CaptionStrip';
import CapturedPhotoStrip from './CapturedPhotoStrip';

// The video stage is deliberately theme-independent: letterboxing around a
// video feed is black in every video player, light mode or dark. Using
// colors.black would invert it to white in dark mode, and colors.textInverse
// would render the overlay text black-on-black.
const STAGE_BACKGROUND = '#000000';
const STAGE_FOREGROUND = '#FFFFFF';

/**
 * How the incoming video is mapped onto the stage. `contain` letterboxes so
 * every pixel the far end sent is visible; `cover` fills and crops.
 */
type VideoFit = 'contain' | 'cover';

/**
 * Auto rule: fill when the source and the stage agree on orientation, letterbox
 * when they don't.
 *
 * The mismatch is what does the damage. A doctor on a laptop publishes 16:9
 * into this tall sheet, and covering it crops away most of the width — the
 * mirror image of a phone's portrait feed being top-and-bottom cropped on a
 * desktop. Until either side has been measured, `cover` is the default, which
 * is what this stage did before it could tell the difference.
 */
const autoFitFor = (
  source: { width: number; height: number } | undefined,
  stage: { width: number; height: number } | null,
): VideoFit => {
  if (!source || !stage || !stage.width || !stage.height) return 'cover';
  const sourceLandscape = source.width >= source.height;
  const stageLandscape = stage.width >= stage.height;
  return sourceLandscape === stageLandscape ? 'cover' : 'contain';
};

export const CallStage: React.FC = () => {
  const colors = useThemeColors();
  const { room, patientName, connectionState, cameraEnabled, recording, captions } =
    useVideoCallSession();
  const { remote, local, remoteMic, hasRemoteParticipant } =
    useCallTracks(room);

  // The stage is flex-sized inside the sheet, so its orientation isn't known
  // statically — it changes with the snap point and with device rotation.
  const [stageSize, setStageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize({ width, height });
  };

  const autoFit = autoFitFor(remote?.publication?.dimensions, stageSize);

  // null follows autoFit. A manual choice sticks while the same camera track is
  // on screen and is dropped when the track is replaced — the far end rejoined
  // or switched device, so the auto rule is the better guess again.
  const [fitOverride, setFitOverride] = useState<VideoFit | null>(null);
  const remoteTrackSid = remote?.publication?.trackSid;
  useEffect(() => {
    setFitOverride(null);
  }, [remoteTrackSid]);

  const fit = fitOverride ?? autoFit;

  return (
    <View
      style={[styles.stage, { backgroundColor: STAGE_BACKGROUND }]}
      onLayout={onStageLayout}
    >
      {/* Recording indicator. Overlaid on the stage rather than tucked into the
          sheet header so it is impossible to be mid-consult and unaware the
          conversation is being written down. Red, always, no exceptions. */}
      {(recording.state === 'recording' || captions.active) && (
        <View style={styles.recordingPill} pointerEvents="none">
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Notes on</Text>
        </View>
      )}

      {captions.active && (
        <CaptionStrip
          segments={captions.segments}
          volatile={captions.volatile}
          patientName={patientName}
        />
      )}

      {/* Remote (patient) */}
      {remote ? (
        <>
          <VideoTrack trackRef={remote} style={styles.remote} objectFit={fit} />
          {/* Top-RIGHT: the recording pill owns top-left and the PiP plus the
              captured-photo strip own the bottom. */}
          <TouchableOpacity
            style={styles.fitToggle}
            onPress={() =>
              setFitOverride(fit === 'contain' ? 'cover' : 'contain')
            }
            accessibilityRole="button"
            accessibilityLabel={
              fit === 'contain' ? 'Fill the frame' : 'Show the whole video'
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {fit === 'contain' ? (
              <Maximize2 size={16} color={STAGE_FOREGROUND} />
            ) : (
              <Minimize2 size={16} color={STAGE_FOREGROUND} />
            )}
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.waiting}>
          {connectionState === 'connecting' ||
          connectionState === 'reconnecting' ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.waitingText, { color: STAGE_FOREGROUND }]}>
                {connectionState === 'reconnecting'
                  ? 'Reconnecting…'
                  : 'Connecting…'}
              </Text>
            </>
          ) : (
            <>
              {/* Camera off is not the same as gone. Visualising their mic
                  keeps them present on screen while they are still talking —
                  a static icon reads as a dropped call. */}
              {hasRemoteParticipant ? (
                <BarVisualizer
                  barCount={5}
                  trackRef={remoteMic}
                  style={styles.remoteVisualizer}
                  options={{
                    minHeight: 0.15,
                    barWidth: 10,
                    barBorderRadius: 5,
                    barColor: STAGE_FOREGROUND,
                  }}
                />
              ) : (
                <UserRound size={40} color={colors.textTertiary} />
              )}
              <Text style={[styles.waitingText, { color: STAGE_FOREGROUND }]}>
                {hasRemoteParticipant
                  ? `${patientName} has their camera off`
                  : `Waiting for ${patientName} to join…`}
              </Text>
            </>
          )}
        </View>
      )}

      {/* Local picture-in-picture */}
      <View
        style={[
          styles.pip,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        {local && cameraEnabled ? (
          <VideoTrack trackRef={local} style={styles.pipVideo} objectFit="cover" />
        ) : (
          <View style={styles.pipPlaceholder}>
            <VideoOff size={16} color={colors.textTertiary} />
          </View>
        )}
      </View>

      <CapturedPhotoStrip />
    </View>
  );
};

const styles = StyleSheet.create({
  recordingPill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    // Hard-coded rather than themed: the stage is deliberately theme
    // independent (always black), and a recording indicator that changes colour
    // with the app theme is one that can end up invisible.
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  stage: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 240,
  },
  remote: {
    flex: 1,
  },
  fitToggle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
    padding: 8,
    borderRadius: borderRadius.sm,
    // Hard-coded like the rest of the stage overlays: this sits on video, not
    // on a themed surface, so it must stay legible in both app themes.
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.base,
  },
  waitingText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  remoteVisualizer: {
    width: 120,
    height: 64,
  },
  pip: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 96,
    height: 128,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pipVideo: {
    width: '100%',
    height: '100%',
  },
  pipPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallStage;
