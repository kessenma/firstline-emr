// apps/mobile/src/components/patient-chart/video-call/components/CallControls.tsx

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BarVisualizer } from '@livekit/react-native';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Camera,
  CameraOff,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography } from '../../../../utils/theme';
import { useVideoCallSession } from '../VideoCallSessionProvider';
import { useCallTracks } from '../hooks/useCallTracks';

export const CallControls: React.FC = () => {
  const colors = useThemeColors();
  const {
    room,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    switchCamera,
    endCall,
    patientName,
  } = useVideoCallSession();
  const { localMic } = useCallTracks(room);

  const confirmEnd = () => {
    Alert.alert('End call?', `This will end the video call with ${patientName}.`, [
      { text: 'Keep talking', style: 'cancel' },
      { text: 'End call', style: 'destructive', onPress: () => void endCall() },
    ]);
  };

  return (
    <View style={styles.row}>
      <ControlButton
        label={micEnabled ? 'Mute' : 'Unmute'}
        active={micEnabled}
        onPress={() => void toggleMic()}
        icon={
          micEnabled ? (
            <Mic size={20} color={colors.text} />
          ) : (
            <MicOff size={20} color={colors.textInverse} />
          )
        }
        // The only confirmation the clinician gets that their own mic is
        // actually picking up — a muted-at-the-OS-level mic looks identical to
        // a working one without it.
        accessory={
          micEnabled ? (
            <BarVisualizer
              barCount={3}
              trackRef={localMic}
              style={styles.micVisualizer}
              options={{
                minHeight: 0.1,
                barWidth: 2,
                barBorderRadius: 1,
                barColor: colors.text,
              }}
            />
          ) : undefined
        }
      />

      <ControlButton
        label={cameraEnabled ? 'Camera' : 'Camera off'}
        active={cameraEnabled}
        onPress={() => void toggleCamera()}
        icon={
          cameraEnabled ? (
            <VideoIcon size={20} color={colors.text} />
          ) : (
            <VideoOff size={20} color={colors.textInverse} />
          )
        }
      />

      <ControlButton
        label="Flip"
        active
        onPress={() => void switchCamera()}
        icon={<SwitchCamera size={20} color={colors.text} />}
      />

      <PhotoControlButton />


      <View style={styles.control}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={confirmEnd}
          accessibilityLabel="End call"
        >
          <PhoneOff size={20} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={[styles.label, { color: colors.textSecondary }]}>End</Text>
      </View>
    </View>
  );
};

/**
 * Two-stage shutter. The first press asks the patient for permission; once they
 * agree the button becomes a plain shutter and stops prompting.
 *
 * The filled/unfilled convention is the one ControlButton already uses for
 * on/off, so "filled" reads as "this will take a photo" without new vocabulary.
 */
const PhotoControlButton: React.FC = () => {
  const colors = useThemeColors();
  const { photos, connectionState } = useVideoCallSession();

  const busy = photos.status === 'requesting' || photos.status === 'capturing';
  const armed = photos.status === 'armed';
  const disabled = busy || connectionState !== 'connected';

  useEffect(() => {
    if (!photos.error) return;
    Alert.alert('Photo', photos.error, [
      { text: 'OK', onPress: photos.clearError },
    ]);
  }, [photos.error, photos.clearError]);

  const label = (() => {
    switch (photos.status) {
      case 'requesting':
        return 'Asking…';
      case 'capturing':
        return 'Saving…';
      case 'denied':
        return 'Ask again';
      case 'armed':
        return 'Photo';
      default:
        return 'Ask photo';
    }
  })();

  const onPress = () => {
    if (armed) void photos.capture();
    else void photos.requestConsent();
  };

  return (
    <View style={styles.control}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: armed ? colors.primary : colors.surfaceSecondary,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={label}
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color={armed ? colors.textInverse : colors.text}
          />
        ) : photos.status === 'denied' ? (
          <CameraOff size={20} color={colors.text} />
        ) : (
          <Camera size={20} color={armed ? colors.textInverse : colors.text} />
        )}
      </TouchableOpacity>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

interface ControlButtonProps {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onPress: () => void;
  /** Rendered beside the icon inside the button. Sized to fit the 52pt circle. */
  accessory?: React.ReactNode;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  label,
  active,
  icon,
  onPress,
  accessory,
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.control}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            // Inverted fill signals "this is off" more clearly than a colour
            // change alone, which is easy to miss mid-consult.
            backgroundColor: active ? colors.surfaceSecondary : colors.text,
          },
        ]}
        onPress={onPress}
        accessibilityLabel={label}
      >
        {icon}
        {accessory}
      </TouchableOpacity>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  control: {
    alignItems: 'center',
    gap: 4,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: typography.fontSize.xs,
  },
  // 20pt icon + 3pt gap + 14pt bars = 37pt inside a 52pt circle.
  micVisualizer: {
    width: 14,
    height: 18,
  },
});

export default CallControls;
