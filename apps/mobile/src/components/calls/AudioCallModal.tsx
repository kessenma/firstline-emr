// apps/mobile/src/components/calls/AudioCallModal.tsx
//
// The in-progress audio call surface.
//
// Audio only: no VideoTrack, no camera controls. The token's grant carries
// canPublishSources: [MICROPHONE], so anything else would be refused
// server-side anyway.
//
// Rendered as a full-screen Modal rather than a BottomSheet — a live call is a
// modal activity, and BottomSheet's Portal detaches React context (see the
// patient-chart CLAUDE.md), which would mean re-providing the call session.

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, PhoneOff, TriangleAlert } from 'lucide-react-native';
import {
  type ActiveCall,
  displayName,
  formatDuration,
  initialsOf,
} from '@fajr/shared/calls';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface AudioCallModalProps {
  call: ActiveCall;
  answered: boolean;
  elapsedSeconds: number;
  micEnabled: boolean;
  onToggleMic: () => void;
  onHangUp: () => void;
}

export function AudioCallModal({
  call,
  answered,
  elapsedSeconds,
  micEnabled,
  onToggleMic,
  onHangUp,
}: AudioCallModalProps) {
  const colors = useThemeColors();

  const status = answered
    ? formatDuration(elapsedSeconds)
    : call.deliverable
      ? 'Ringing…'
      : 'Not reachable';

  return (
    <Modal visible animationType="slide" onRequestClose={onHangUp}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.body}>
          {call.callee.image ? (
            <Image source={{ uri: call.callee.image }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {initialsOf(call.callee)}
              </Text>
            </View>
          )}

          <Text style={[styles.name, { color: colors.text }]}>
            {displayName(call.callee)}
          </Text>
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            {status}
          </Text>

          {/* Unreachable is a dead end, not a slow ring: notifications are off
              or no VoIP device is registered. Distinct from quiet hours, and
              not something the caller can override — so say so rather than
              letting them watch a ring that will never land. */}
          {!call.deliverable && !answered && (
            <View
              style={[
                styles.warning,
                {
                  backgroundColor: colors.error + '15',
                  borderColor: colors.error + '40',
                },
              ]}
            >
              <TriangleAlert size={16} color={colors.error} />
              <Text style={[styles.warningText, { color: colors.error }]}>
                {displayName(call.callee)} won&apos;t be notified — call
                notifications are off or no device is registered. They can still
                join from the app.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                backgroundColor: micEnabled ? colors.surface : colors.text,
                borderColor: colors.border,
              },
            ]}
            onPress={onToggleMic}
            activeOpacity={0.7}
            accessibilityLabel={
              micEnabled ? 'Mute microphone' : 'Unmute microphone'
            }
          >
            {micEnabled ? (
              <Mic size={24} color={colors.text} />
            ) : (
              <MicOff size={24} color={colors.background} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.error }]}
            onPress={onHangUp}
            activeOpacity={0.7}
            accessibilityLabel="Hang up"
          >
            <PhoneOff size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: typography.fontWeight.bold,
  },
  name: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  status: {
    fontSize: typography.fontSize.base,
    fontVariant: ['tabular-nums'],
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});

export default AudioCallModal;
