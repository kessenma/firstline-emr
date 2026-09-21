// apps/mobile/src/components/patient-chart/video-call/components/CallPillThumb.tsx
//
// Live video thumbnail rendered into the BottomSheet header's titleAccessory
// slot. Because the header is drawn at every snap point, this is what keeps the
// patient visible while the call is minimized and the clinician is charting.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarVisualizer, VideoTrack } from '@livekit/react-native';
import { VideoOff } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography } from '../../../../utils/theme';
import { useVideoCallSession } from '../VideoCallSessionProvider';
import { useCallTracks } from '../hooks/useCallTracks';

const formatTimer = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const CallPillThumb: React.FC = () => {
  const colors = useThemeColors();
  const { room, connectionState, elapsedSeconds, recording } =
    useVideoCallSession();
  const { remote, remoteMic } = useCallTracks(room);

  if (connectionState !== 'connected' && connectionState !== 'reconnecting') {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Visible at the minimized snap point too — that is the state where a
          clinician is browsing the chart and most likely to forget a recording
          is running. */}
      {recording.state === 'recording' && <View style={styles.recordingDot} />}
      <View style={[styles.thumb, { backgroundColor: colors.surfaceSecondary }]}>
        {remote ? (
          <VideoTrack trackRef={remote} style={styles.video} objectFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <VideoOff size={14} color={colors.textTertiary} />
          </View>
        )}
      </View>

      {/* Minimized, the thumbnail is often a still frame of someone sitting
          quietly. The bars are what tell the clinician the call is still live
          and the patient is talking, without reopening the sheet. */}
      {connectionState === 'connected' && (
        <BarVisualizer
          barCount={3}
          trackRef={remoteMic}
          style={styles.visualizer}
          options={{
            minHeight: 0.1,
            barWidth: 2,
            barBorderRadius: 1,
            barColor: colors.textSecondary,
          }}
        />
      )}

      <Text style={[styles.timer, { color: colors.textSecondary }]}>
        {connectionState === 'reconnecting'
          ? 'Reconnecting…'
          : formatTimer(elapsedSeconds)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizer: {
    width: 14,
    height: 16,
  },
  timer: {
    fontSize: typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
  },
});

export default CallPillThumb;
