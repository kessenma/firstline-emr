// apps/mobile/src/hooks/useVoipRegistration.ts
//
// Registers this device's PushKit token so colleagues can ring it.
//
// Separate from PushNotificationService on purpose: a PushKit token is a
// different token from the same device than the APNs alert token, and it is
// stored as its own push_devices row with platform "ios_voip". Merging them
// would mean alert pushes could target a VoIP token, which APNs drops silently.
//
// The token can arrive before JS is running (iOS issues it during
// didFinishLaunching), so both paths are covered: an initial read of whatever
// the native side already holds, plus a listener for later rotations.

import { useEffect } from 'react';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { staffCallKit } from '../services/StaffCallKit';

async function registerVoipToken(token: string): Promise<void> {
  if (!token) return;

  try {
    const authToken = await getStoredToken();
    if (!authToken) return;

    const res = await fetch(getApiUrl('/user/device-token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token,
        platform: 'ios_voip',
        // Must match the APNs gateway that minted it: a Debug build's token is
        // only valid against sandbox. notifications-server routes on this.
        environment: __DEV__ ? 'dev' : 'prod',
        deviceId: await DeviceInfo.getUniqueId(),
        deviceModel: DeviceInfo.getModel(),
        appVersion: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
      }),
    });

    if (!res.ok) {
      console.warn('[VoIP] token registration failed:', res.status);
      return;
    }
    console.log('[VoIP] PushKit token registered');
  } catch (err) {
    console.warn('[VoIP] token registration error:', err);
  }
}

/**
 * @param isAuthenticated only register once there is a session — the endpoint
 * needs a bearer token, and an unauthenticated attempt just 401s.
 */
export function useVoipRegistration(isAuthenticated: boolean): void {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!isAuthenticated) return;
    if (!staffCallKit.isAvailable()) return;

    let cancelled = false;

    // iOS usually issues the PushKit token before JS is up, so read what the
    // native side already has rather than waiting for an event that has been
    // and gone.
    void staffCallKit.getVoipToken().then(token => {
      if (!cancelled && token) void registerVoipToken(token);
    });

    // And catch rotations (reinstall, restore, token invalidation).
    const sub = staffCallKit.addListener('voipTokenReceived', ({ token }) => {
      if (!cancelled) void registerVoipToken(token);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isAuthenticated]);
}

export default useVoipRegistration;
