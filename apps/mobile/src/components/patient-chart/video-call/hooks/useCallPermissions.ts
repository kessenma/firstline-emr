// apps/mobile/src/components/patient-chart/video-call/hooks/useCallPermissions.ts
//
// Camera + microphone permissions for video consults.
//
// This is the app's first explicit camera request — the media gallery relies on
// react-native-image-picker prompting internally. Modeled on the mic branch in
// notes/voice-dictation/useAudioRecorder.ts.
import { useCallback, useState } from 'react';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

export type CallPermissionState = 'unknown' | 'granted' | 'denied';

export interface CallPermissionRequest {
  /**
   * Whether the camera is needed too. Staff audio calls pass false — asking
   * for the camera to place a voice call reads as a privacy overreach, and on
   * Android a denied CAMERA would block an otherwise fine audio call.
   */
  video?: boolean;
}

export interface UseCallPermissions {
  status: CallPermissionState;
  requesting: boolean;
  /** Returns true only when every requested permission is usable. */
  request: (opts?: CallPermissionRequest) => Promise<boolean>;
  openSettings: () => void;
}

export function useCallPermissions(): UseCallPermissions {
  const [status, setStatus] = useState<CallPermissionState>('unknown');
  const [requesting, setRequesting] = useState(false);

  const request = useCallback(
    async (opts?: CallPermissionRequest): Promise<boolean> => {
    const needsVideo = opts?.video !== false;
    setRequesting(true);
    try {
      if (Platform.OS === 'android') {
        const wanted = needsVideo
          ? [
              PermissionsAndroid.PERMISSIONS.CAMERA,
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ]
          : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

        const results = await PermissionsAndroid.requestMultiple(wanted);

        const granted = wanted.every(
          p => results[p] === PermissionsAndroid.RESULTS.GRANTED,
        );

        setStatus(granted ? 'granted' : 'denied');
        return granted;
      }

      // iOS has no pre-flight request API here: AVFoundation prompts the first
      // time a track is captured, driven by the Info.plist usage strings. The
      // LiveKit connect call surfaces a failure if the user declines, which
      // the session provider turns into an error state.
      setStatus('granted');
      return true;
    } catch (error) {
      console.error('[VideoCall] permission request failed:', error);
      setStatus('denied');
      return false;
    } finally {
      setRequesting(false);
    }
    },
    [],
  );

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Permissions needed',
        'Enable camera and microphone access for FajrEMR in your device settings to join video calls.',
      );
    });
  }, []);

  return { status, requesting, request, openSettings };
}
