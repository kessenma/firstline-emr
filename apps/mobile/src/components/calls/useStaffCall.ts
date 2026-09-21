// apps/mobile/src/components/calls/useStaffCall.ts
//
// Places and tears down a staff-to-staff audio call, and owns the LiveKit Room
// for its lifetime.
//
// Mirrors apps/web/components/calls/useStaffCall.ts — same API, same quiet-hours
// round trip — but adds what the browser does not need: an explicit native
// AudioSession, a microphone permission request, and a Room instance we manage
// by hand (there is no <LiveKitRoom> component on RN).
//
// The quiet-hours 409 is why this is a state machine rather than one async
// call: the server creates *nothing* when a callee is inside quiet hours, so
// the caller has to confirm and the request has to be replayed with
// overrideQuietHours. That decision can only be made server-side — user_settings
// syncs only the owning user's row, so a caller's device cannot know the
// callee's quiet-hours state.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSession } from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';
import type {
  ActiveCall,
  DirectoryUser,
  PlaceCallResponse,
  QuietHoursCallee,
} from '@fajr/shared/calls';
import { getApiUrl } from '../../config';
import { getStoredToken } from '../../utils/storage';
import { useCallPermissions } from '../patient-chart/video-call/hooks/useCallPermissions';

export type CallPhase =
  | { kind: 'idle' }
  | { kind: 'placing'; callee: DirectoryUser }
  /** Server refused to ring; awaiting the caller's explicit override. */
  | { kind: 'quietHours'; callee: DirectoryUser; blocked: QuietHoursCallee[] }
  | { kind: 'active'; call: ActiveCall }
  | { kind: 'error'; message: string };

export interface StaffCallController {
  phase: CallPhase;
  room: Room;
  /** True once a remote participant is actually in the room. */
  answered: boolean;
  /** Seconds since the far side joined. Zero while ringing. */
  elapsedSeconds: number;
  micEnabled: boolean;
  placeCall: (
    callee: DirectoryUser,
    opts?: { overrideQuietHours?: boolean },
  ) => Promise<void>;
  confirmQuietHours: () => void;
  endCall: (reason?: string) => Promise<void>;
  toggleMic: () => Promise<void>;
  dismiss: () => void;
}

export function useStaffCall(): StaffCallController {
  // One Room for the hook's lifetime — recreating it on re-render drops the call.
  const roomRef = useRef<Room | null>(null);
  if (roomRef.current === null) {
    // adaptiveStream/dynacast are video concerns; an audio-only call gains
    // nothing from them and they add subscription churn.
    roomRef.current = new Room();
  }
  const room = roomRef.current;

  const [phase, setPhase] = useState<CallPhase>({ kind: 'idle' });
  const [answered, setAnswered] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);

  const permissions = useCallPermissions();

  // Mirrors the active call id for teardown paths that cannot read state from a
  // stale closure (unmount, backgrounding).
  const activeCallIdRef = useRef<string | null>(null);
  const placingRef = useRef(false);
  // Guards against an unmount race double-stopping the audio session.
  const audioSessionActive = useRef(false);

  const stopAudioSession = useCallback(async () => {
    if (!audioSessionActive.current) return;
    audioSessionActive.current = false;
    try {
      await AudioSession.stopAudioSession();
    } catch (err) {
      console.warn('[StaffCall] stopAudioSession failed:', err);
    }
  }, []);

  const setPhaseSafe = useCallback((next: CallPhase) => {
    if (next.kind === 'active') {
      activeCallIdRef.current = next.call.callId;
    } else if (next.kind !== 'quietHours' && next.kind !== 'placing') {
      activeCallIdRef.current = null;
    }
    setPhase(next);
  }, []);

  // ---- Room events ----
  useEffect(() => {
    const syncParticipants = () => {
      setAnswered(room.remoteParticipants.size > 0);
    };

    const handleDisconnected = () => {
      setAnswered(false);
      setElapsedSeconds(0);
      void stopAudioSession();
    };

    room
      .on(RoomEvent.ParticipantConnected, syncParticipants)
      .on(RoomEvent.ParticipantDisconnected, syncParticipants)
      .on(RoomEvent.Connected, syncParticipants)
      .on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room
        .off(RoomEvent.ParticipantConnected, syncParticipants)
        .off(RoomEvent.ParticipantDisconnected, syncParticipants)
        .off(RoomEvent.Connected, syncParticipants)
        .off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, stopAudioSession]);

  // ---- Elapsed timer ----
  // Starts when the far side joins, not when we connected — otherwise the
  // caller watches a duration tick upward while it is still ringing.
  useEffect(() => {
    if (!answered) return;

    const startedAt = Date.now() - elapsedSeconds * 1000;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
    // elapsedSeconds is deliberately not a dependency — including it would
    // restart the interval every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  const placeCall = useCallback(
    async (callee: DirectoryUser, opts?: { overrideQuietHours?: boolean }) => {
      if (placingRef.current) return;
      placingRef.current = true;
      setPhaseSafe({ kind: 'placing', callee });

      try {
        // Ask before creating anything: a call the caller cannot speak into is
        // worse than no call, and the permission sheet is a hard interrupt.
        const allowed = await permissions.request({ video: false });
        if (!allowed) {
          setPhaseSafe({
            kind: 'error',
            message: 'Microphone access is required to place a call.',
          });
          return;
        }

        const authToken = await getStoredToken();
        const res = await fetch(getApiUrl('/calls'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            calleeIds: [callee.id],
            kind: 'audio',
            overrideQuietHours: opts?.overrideQuietHours === true,
          }),
        });

        // Quiet hours: nothing was created. Ask, then replay with the override.
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          if (data?.error === 'quiet_hours') {
            setPhaseSafe({
              kind: 'quietHours',
              callee,
              blocked: Array.isArray(data.callees) ? data.callees : [],
            });
            return;
          }
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Could not place the call');
        }

        const data = (await res.json()) as PlaceCallResponse;
        if (!data.token || !data.url) {
          throw new Error('Calling is not configured on this server');
        }

        // Must precede connect(): on iOS the native audio session has to be
        // active before tracks are published, or the call is silent.
        await AudioSession.startAudioSession();
        audioSessionActive.current = true;

        await room.connect(data.url, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicEnabled(true);
        setAnswered(room.remoteParticipants.size > 0);

        setPhaseSafe({
          kind: 'active',
          call: {
            callId: data.call.id,
            roomName: data.call.roomName,
            kind: data.call.kind,
            token: data.token,
            serverUrl: data.url,
            callee,
            deliverable: data.deliverable,
            callees: data.callees ?? [],
          },
        });
      } catch (err) {
        console.error('[StaffCall] place failed:', err);
        await stopAudioSession();
        setPhaseSafe({
          kind: 'error',
          message:
            err instanceof Error ? err.message : 'Could not place the call',
        });
      } finally {
        placingRef.current = false;
      }
    },
    [permissions, room, setPhaseSafe, stopAudioSession],
  );

  const confirmQuietHours = useCallback(() => {
    if (phase.kind !== 'quietHours') return;
    void placeCall(phase.callee, { overrideQuietHours: true });
  }, [phase, placeCall]);

  const endCall = useCallback(
    async (reason: string = 'hangup') => {
      const callId = activeCallIdRef.current;
      activeCallIdRef.current = null;
      setPhaseSafe({ kind: 'idle' });
      setAnswered(false);
      setElapsedSeconds(0);

      try {
        await room.disconnect();
      } catch (err) {
        console.warn('[StaffCall] disconnect failed:', err);
      }
      await stopAudioSession();

      if (!callId) return;
      try {
        const authToken = await getStoredToken();
        await fetch(getApiUrl(`/calls/${callId}/end`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ reason }),
        });
      } catch (err) {
        // The LiveKit room_finished webhook is the authoritative fallback, so a
        // failure here delays the log rather than corrupting it.
        console.warn('[StaffCall] end notification failed:', err);
      }
    },
    [room, setPhaseSafe, stopAudioSession],
  );

  const toggleMic = useCallback(async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
    } catch (err) {
      console.warn('[StaffCall] toggle mic failed:', err);
      setMicEnabled(!next);
    }
  }, [micEnabled, room]);

  const dismiss = useCallback(() => {
    setPhaseSafe({ kind: 'idle' });
  }, [setPhaseSafe]);

  // NOTE: unlike the patient video call, there is deliberately no AppState
  // teardown here. An audio call legitimately continues while the app is
  // backgrounded — that is exactly what UIBackgroundModes:audio is for — so
  // only unmount ends the call.

  // Close out a call the user walks away from. Without this the row sits in
  // `ringing` until the webhook fires, and the callee's phone keeps ringing.
  useEffect(() => {
    return () => {
      const callId = activeCallIdRef.current;
      activeCallIdRef.current = null;
      void room.disconnect().catch(() => {});
      void stopAudioSession();

      if (!callId) return;
      void (async () => {
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
        } catch {
          // Webhook closes the log out regardless.
        }
      })();
    };
  }, [room, stopAudioSession]);

  return {
    phase,
    room,
    answered,
    elapsedSeconds,
    micEnabled,
    placeCall,
    confirmQuietHours,
    endCall,
    toggleMic,
    dismiss,
  };
}
