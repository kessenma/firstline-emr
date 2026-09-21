// apps/mobile/src/components/calls/IncomingCallHost.tsx
//
// Answers incoming staff calls. Mounted once, app-wide — a call can arrive on
// any screen, so this cannot live under Messages.
//
// It draws no ringing UI of its own: CallKit owns that, including the lock
// screen, the ringtone and the vibration. By the time JS hears `callAnswered`
// the user has already tapped Answer on a native UI that was raised before this
// file was even loaded. All that is left is to join the room and render the
// in-call surface.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSession } from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';
import type { DirectoryUser } from '@fajr/shared/calls';
import { getApiUrl } from '../../config';
import { getStoredToken } from '../../utils/storage';
import { staffCallKit } from '../../services/StaffCallKit';
import { AudioCallModal } from './AudioCallModal';

interface AcceptResponse {
  token: string;
  url: string;
  roomName: string;
  call: { id: string; status: string; answeredAt: string | null };
}

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
}

export function IncomingCallHost() {
  // One Room for the component's lifetime; recreating it would drop the call.
  const roomRef = useRef<Room | null>(null);
  if (roomRef.current === null) {
    roomRef.current = new Room();
  }
  const room = roomRef.current;

  const [active, setActive] = useState<IncomingCall | null>(null);
  const [connected, setConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);

  // The invite tells us who is calling. CallKit's answer event carries only the
  // call id, so the name has to be remembered from the invite that preceded it.
  const invites = useRef<Map<string, IncomingCall>>(new Map());
  const audioSessionActive = useRef(false);
  const activeCallIdRef = useRef<string | null>(null);

  const stopAudioSession = useCallback(async () => {
    if (!audioSessionActive.current) return;
    audioSessionActive.current = false;
    try {
      await AudioSession.stopAudioSession();
    } catch (err) {
      console.warn('[IncomingCall] stopAudioSession failed:', err);
    }
  }, []);

  const teardown = useCallback(
    async (opts?: { notifyServer?: boolean; notifyCallKit?: boolean }) => {
      const callId = activeCallIdRef.current;
      activeCallIdRef.current = null;

      setActive(null);
      setConnected(false);
      setElapsedSeconds(0);

      try {
        await room.disconnect();
      } catch {
        // Already disconnected.
      }
      await stopAudioSession();

      if (!callId) return;

      // Only when JS initiated the hang-up. If CallKit told us the call ended,
      // dismissing it again would be a redundant round trip.
      if (opts?.notifyCallKit) {
        void staffCallKit.endCall(callId);
      }

      if (opts?.notifyServer !== false) {
        try {
          const authToken = await getStoredToken();
          await fetch(getApiUrl(`/calls/${callId}/end`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ reason: 'hangup' }),
          });
        } catch (err) {
          // The LiveKit webhook closes the log out regardless.
          console.warn('[IncomingCall] end notification failed:', err);
        }
      }
    },
    [room, stopAudioSession],
  );

  // ---- Room events ----
  useEffect(() => {
    const onConnected = () => setConnected(true);
    const onDisconnected = () => {
      // The far side hung up. Dismiss CallKit too, or its UI outlives the call.
      void teardown({ notifyServer: false, notifyCallKit: true });
    };

    room
      .on(RoomEvent.Connected, onConnected)
      .on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room
        .off(RoomEvent.Connected, onConnected)
        .off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, teardown]);

  // ---- Elapsed timer ----
  useEffect(() => {
    if (!connected) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [connected]);

  // ---- Join on answer ----
  const joinCall = useCallback(
    async (callId: string) => {
      try {
        const authToken = await getStoredToken();
        const res = await fetch(getApiUrl(`/calls/${callId}/accept`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ clientPlatform: 'ios' }),
        });

        if (!res.ok) throw new Error(`accept failed: ${res.status}`);
        const data = (await res.json()) as AcceptResponse;

        // Must precede connect(): on iOS the audio session has to be live
        // before tracks are published or the call is silent.
        await AudioSession.startAudioSession();
        audioSessionActive.current = true;

        await room.connect(data.url, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicEnabled(true);
        activeCallIdRef.current = callId;

        // Flips CallKit's UI from "connecting" to a running call timer.
        void staffCallKit.reportConnected(callId);
      } catch (err) {
        console.error('[IncomingCall] join failed:', err);
        await teardown({ notifyCallKit: true });
      }
    },
    [room, teardown],
  );

  // ---- Native events ----
  useEffect(() => {
    if (!staffCallKit.isAvailable()) return;

    const subs = [
      staffCallKit.addListener('callInvite', invite => {
        invites.current.set(invite.callId, invite);
      }),

      staffCallKit.addListener('callAnswered', ({ callId }) => {
        const invite = invites.current.get(callId) ?? {
          callId,
          callerId: '',
          // A cold launch can deliver the answer without the invite that
          // preceded it; a neutral label beats showing a raw uuid.
          callerName: 'Incoming call',
        };
        setActive(invite);
        void joinCall(callId);
      }),

      staffCallKit.addListener('callEnded', ({ callId }) => {
        invites.current.delete(callId);
        // CallKit already dismissed its own UI, so don't ask it again.
        void teardown({ notifyCallKit: false });
      }),

      staffCallKit.addListener('callCancelled', ({ callId }) => {
        invites.current.delete(callId);
      }),

      staffCallKit.addListener('callMuteChanged', ({ muted }) => {
        // Keep our control in sync when muting happens from the CallKit UI.
        setMicEnabled(!muted);
        void room.localParticipant.setMicrophoneEnabled(!muted).catch(() => {});
      }),
    ];

    return () => subs.forEach(s => s.remove());
  }, [joinCall, room, teardown]);

  const toggleMic = useCallback(async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
    } catch (err) {
      console.warn('[IncomingCall] toggle mic failed:', err);
      setMicEnabled(!next);
    }
  }, [micEnabled, room]);

  if (!active) return null;

  const callee: DirectoryUser = {
    id: active.callerId,
    email: '',
    firstName: active.callerName,
    lastName: '',
    accountType: '',
    image: null,
  };

  return (
    <AudioCallModal
      call={{
        callId: active.callId,
        roomName: '',
        kind: 'audio',
        token: '',
        serverUrl: '',
        callee,
        // Always true for an incoming call: the ring has already landed, so a
        // "not reachable" warning would be nonsense here.
        deliverable: true,
        callees: [],
      }}
      answered={connected}
      elapsedSeconds={elapsedSeconds}
      micEnabled={micEnabled}
      onToggleMic={() => void toggleMic()}
      onHangUp={() => void teardown({ notifyCallKit: true })}
    />
  );
}

export default IncomingCallHost;
