// apps/mobile/src/components/calls/CallLauncher.tsx
//
// Single entry point for placing a staff call: the button plus every dialog the
// flow can land in. Host screens render just this, so they don't have to know
// about the quiet-hours round trip.
//
// Mirrors apps/web/components/calls/CallLauncher.tsx.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Phone } from 'lucide-react-native';
import type { DirectoryUser } from '@fajr/shared/calls';
import { useThemeColors } from '../../contexts/ThemeContext';
import { borderRadius } from '../../utils/theme';
import { CallDirectoryModal } from './CallDirectoryModal';
import { AudioCallModal } from './AudioCallModal';
import { useStaffCall } from './useStaffCall';

interface CallLauncherProps {
  style?: ViewStyle;
  /** Rendered instead of the default round button when provided. */
  children?: React.ReactNode;
}

export function CallLauncher({ style, children }: CallLauncherProps) {
  const colors = useThemeColors();
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const {
    phase,
    answered,
    elapsedSeconds,
    micEnabled,
    placeCall,
    confirmQuietHours,
    endCall,
    toggleMic,
    dismiss,
  } = useStaffCall();

  const handleSelect = useCallback(
    (user: DirectoryUser) => {
      void placeCall(user);
    },
    [placeCall],
  );

  // Close the directory once the call is live so it isn't stacked behind the
  // call screen. Left open through `placing`/`quietHours` so cancelling returns
  // the user to the list they were browsing.
  useEffect(() => {
    if (phase.kind === 'active') setDirectoryOpen(false);
  }, [phase.kind]);

  // Quiet hours and errors are one-shot decisions, so a native Alert is the
  // right weight — a bespoke modal would stack on top of the directory sheet.
  useEffect(() => {
    if (phase.kind !== 'quietHours') return;

    const one = phase.blocked.length === 1 ? phase.blocked[0] : null;
    Alert.alert(
      "They're in quiet hours",
      one
        ? `${one.name} has quiet hours on${
            one.until ? ` until ${one.until}` : ''
          }. Calling anyway will ring their device.`
        : 'Some people you’re calling have quiet hours on. Calling anyway will ring their device.',
      [
        { text: 'Cancel', style: 'cancel', onPress: dismiss },
        { text: 'Call anyway', onPress: confirmQuietHours },
      ],
      { cancelable: false },
    );
  }, [phase, confirmQuietHours, dismiss]);

  useEffect(() => {
    if (phase.kind !== 'error') return;
    Alert.alert('Call failed', phase.message, [
      { text: 'OK', onPress: dismiss },
    ]);
  }, [phase, dismiss]);

  const placingUserId = phase.kind === 'placing' ? phase.callee.id : null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setDirectoryOpen(true)}
        activeOpacity={0.7}
        accessibilityLabel="Call a colleague"
        style={[
          children ? undefined : [styles.button, { backgroundColor: colors.surface, borderColor: colors.border }],
          style,
        ]}
      >
        {children ?? <Phone size={18} color={colors.primary} />}
      </TouchableOpacity>

      <CallDirectoryModal
        visible={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        onSelect={handleSelect}
        placingUserId={placingUserId}
      />

      {phase.kind === 'active' && (
        <AudioCallModal
          call={phase.call}
          answered={answered}
          elapsedSeconds={elapsedSeconds}
          micEnabled={micEnabled}
          onToggleMic={() => void toggleMic()}
          onHangUp={() => void endCall('hangup')}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
});

export default CallLauncher;
