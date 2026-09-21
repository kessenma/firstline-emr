// apps/mobile/src/components/patient-chart/video-call/VideoCallSessionProvider.tsx
//
// Owns the LiveKit Room for a patient consult.
//
// The Room lives here — above every sheet — rather than inside the call UI, so
// minimizing the call sheet (or swapping the section sheet's contents) cannot
// tear down an in-progress call.
//
// Deliberately free of patient-chart imports: it takes patientId/patientName as
// props. Today the provider is mounted at the patient chart root, but making a
// call survive navigating elsewhere in the app should be a move of this
// component, not a rewrite.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { AudioSession } from '@livekit/react-native';
import {
  Room,
  RoomEvent,
  type ConnectionState,
  type LocalVideoTrack,
} from 'livekit-client';
import type {
  StartCallResponse,
  VideoCallConnectionState,
} from '@fajr/shared/video-call';
import { getApiUrl } from '../../../config';
import { getStoredToken } from '../../../utils/storage';
import { languageToBcp47 } from '@fajr/shared/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { useCallTranscriptionMode } from '../../../hooks/useCallTranscriptionMode';
import { useCallPermissions } from './hooks/useCallPermissions';
import {
  useCallRecording,
  type CallRecordingController,
} from './hooks/useCallRecording';
import {
  useLiveCaptions,
  type LiveCaptionsController,
} from './hooks/useLiveCaptions';
import { useLiveTranscriptNote } from './hooks/useLiveTranscriptNote';
import { usePhotoCapture } from './hooks/usePhotoCapture';
import type { PhotoCaptureController } from './hooks/usePhotoCapture';

interface VideoCallSessionValue {
  room: Room;
  patientId: string;
  patientName: string;

  connectionState: VideoCallConnectionState;
  activeCall: StartCallResponse | null;
  error: string | null;
  /** Seconds since the call connected — drives the header timer. */
  elapsedSeconds: number;

  micEnabled: boolean;
  cameraEnabled: boolean;

  /** True while the call sheet is at the minimized pill snap point. */
  isMinimized: boolean;
  setMinimized: (minimized: boolean) => void;

  /**
   * False when the call sheet has been swiped away while a call is still live.
   * The Video section uses this to offer a way back in — without it the call
   * runs on with no visible controls.
   */
  sheetPresented: boolean;
  setSheetPresented: (presented: boolean) => void;
  /** Bumping this asks the sheet to re-present itself. */
  reopenRequestId: number;
  requestReopen: () => void;

  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
  clearError: () => void;

  /** Chart photos captured during this call. See hooks/usePhotoCapture. */
  photos: PhotoCaptureController;

  /** On-device transcription of this call. See hooks/useCallRecording. */
  recording: CallRecordingController;

  /** Live captions, when the clinician's mode is 'live'. */
  captions: LiveCaptionsController;

  /** The patient's answer to the transcription request for THIS call.
   *  'unknown' until they tell us; nothing is recorded in that state. */
  patientConsent: PatientTranscriptionConsent;
}

/**
 * Fail-closed by construction: only an explicit 'granted' permits recording.
 * A dropped message, an old client that never sends one, a patient who
 * declines, and a patient who never joins all land on 'unknown' or 'declined'.
 */
export type PatientTranscriptionConsent = 'unknown' | 'granted' | 'declined';

const VideoCallSessionContext = createContext<VideoCallSessionValue | null>(
  null,
);

export const useVideoCallSession = (): VideoCallSessionValue => {
  const context = useContext(VideoCallSessionContext);
  if (!context) {
    throw new Error(
      'useVideoCallSession must be used within a VideoCallSessionProvider',
    );
  }
  return context;
};

/**
 * Re-provide the session inside a BottomSheet. The sheet renders through a
 * Portal, which detaches the React context tree — the same reason
 * PatientChartContext has to be re-provided there.
 */
export const VideoCallSessionBridge: React.FC<{
  value: VideoCallSessionValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <VideoCallSessionContext.Provider value={value}>
    {children}
  </VideoCallSessionContext.Provider>
);

interface VideoCallSessionProviderProps {
  patientId: string;
  patientName: string;
  /** Denormalized onto every note row, so note creation needs it. Passed as a
   *  prop rather than read from PatientChartContext to keep this file free of
   *  patient-chart imports (see the header). */
  patientEmail?: string;
  /** Display name from patients.language, e.g. "Arabic". Mapped to BCP-47 for
   *  the speech engine. */
  patientLanguage?: string | null;
  /**
   * Fired when a chart photo is captured or deleted during the call, so the
   * patient chart can update without waiting for PowerSync.
   *
   * A prop rather than an import: this file is deliberately free of
   * patient-chart dependencies (see the header), and reaching into
   * PatientChartContext here would tie the call to the screen it happens to be
   * mounted under today.
   */
  onPhotosChanged?: (
    change:
      | { type: 'added'; mediaId: string; filePath: string }
      | { type: 'removed'; mediaId: string },
  ) => void;
  children: React.ReactNode;
}

export const VideoCallSessionProvider: React.FC<
  VideoCallSessionProviderProps
> = ({
  patientId,
  patientName,
  patientEmail,
  patientLanguage,
  onPhotosChanged,
  children,
}) => {
  // One Room for the lifetime of the provider. Recreating it on re-render would
  // drop the call.
  const roomRef = useRef<Room | null>(null);
  if (roomRef.current === null) {
    roomRef.current = new Room({ adaptiveStream: true, dynacast: true });
  }
  const room = roomRef.current;

  const [connectionState, setConnectionState] =
    useState<VideoCallConnectionState>('idle');
  const [activeCall, setActiveCall] = useState<StartCallResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isMinimized, setMinimized] = useState(false);
  const [sheetPresented, setSheetPresented] = useState(false);
  const [reopenRequestId, setReopenRequestId] = useState(0);
  const [patientConsent, setPatientConsent] =
    useState<PatientTranscriptionConsent>('unknown');

  const requestReopen = useCallback(() => {
    setReopenRequestId((id) => id + 1);
  }, []);

  const permissions = useCallPermissions();

  // Guards teardown so an unmount race can't double-stop the audio session.
  const audioSessionActive = useRef(false);

  // Which camera is publishing. Tracked here because LiveKit exposes no getter
  // for it, and the flip control has to know what to switch away from.
  const facingMode = useRef<'user' | 'environment'>('user');

  const stopAudioSession = useCallback(async () => {
    if (!audioSessionActive.current) return;
    audioSessionActive.current = false;
    try {
      await AudioSession.stopAudioSession();
    } catch (err) {
      console.warn('[VideoCall] stopAudioSession failed:', err);
    }
  }, []);

  // ---- Room event wiring ----
  useEffect(() => {
    const handleConnected = () => setConnectionState('connected');
    const handleReconnecting = () => setConnectionState('reconnecting');
    const handleReconnected = () => setConnectionState('connected');
    const handleDisconnected = () => {
      setConnectionState('disconnected');
      setActiveCall(null);
      // Consent is per call and never inherited by the next one.
      setPatientConsent('unknown');
      setElapsedSeconds(0);
      setMinimized(false);
      setSheetPresented(false);
      void stopAudioSession();
    };
    const handleStateChanged = (state: ConnectionState) => {
      // Covers transitions the named events miss (e.g. signal reconnects).
      if (state === 'connected') setConnectionState('connected');
    };

    // The patient's consent decision arrives over the data channel. Both sides
    // are already granted canPublishData, so this needs no token change.
    // Re-sent by the patient on ParticipantConnected too, so a clinician who
    // reconnects mid-call still learns the answer.
    const handleData = (payload: Uint8Array) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        if (message?.t !== 'consent') return;
        if (message.transcription === 'granted') {
          setPatientConsent('granted');
        } else {
          // Covers an explicit decline AND a mid-call withdrawal.
          setPatientConsent('declined');
        }
      } catch {
        // Unparseable payload is not consent.
      }
    };

    room
      .on(RoomEvent.DataReceived, handleData)
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.Reconnecting, handleReconnecting)
      .on(RoomEvent.Reconnected, handleReconnected)
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.ConnectionStateChanged, handleStateChanged);

    return () => {
      room
        .off(RoomEvent.DataReceived, handleData)
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.Reconnecting, handleReconnecting)
        .off(RoomEvent.Reconnected, handleReconnected)
        .off(RoomEvent.Disconnected, handleDisconnected)
        .off(RoomEvent.ConnectionStateChanged, handleStateChanged);
    };
  }, [room, stopAudioSession]);

  // ---- Elapsed timer ----
  useEffect(() => {
    if (connectionState !== 'connected') return;

    const startedAt = Date.now() - elapsedSeconds * 1000;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
    // elapsedSeconds is intentionally not a dependency — including it would
    // restart the interval every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  // ---- Teardown on unmount ----
  // Chart-scoped: leaving the patient chart ends the call rather than leaking a
  // room that nobody can see or hang up.
  useEffect(() => {
    return () => {
      void room.disconnect();
      void stopAudioSession();
    };
  }, [room, stopAudioSession]);

  // Camera capture stops when iOS suspends the app; drop it explicitly so the
  // other side sees a clean video-off rather than a frozen last frame.
  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next !== 'background') return;
      if (room.state !== 'connected') return;
      void room.localParticipant.setCameraEnabled(false).catch(() => {});
      setCameraEnabled(false);
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [room]);

  const startCall = useCallback(async () => {
    setError(null);
    setConnectionState('requesting-permissions');

    const allowed = await permissions.request();
    if (!allowed) {
      setConnectionState('error');
      setError(
        'Camera and microphone access are required to start a video call.',
      );
      return;
    }

    setConnectionState('connecting');

    try {
      const authToken = await getStoredToken();
      const response = await fetch(getApiUrl('/video-call/start'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Could not start the call');
      }

      const call = (await response.json()) as StartCallResponse;

      // Publish the call BEFORE connecting, not after. Everything downstream
      // keys off activeCall — the sheet uses its sessionId to know a new call
      // began, and the Video section reads inviteUrl from it. Setting it only
      // after connect() left both waiting on a ~2s round trip for data that
      // already existed, so the clinician stared at an empty screen and had no
      // invite link to send while the call was still coming up.
      setActiveCall(call);

      // Must precede connect(): the native audio session has to be active
      // before tracks are published, or the call is silent on iOS.
      await AudioSession.startAudioSession();
      audioSessionActive.current = true;

      await room.connect(call.serverUrl, call.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);

      setMicEnabled(true);
      setCameraEnabled(true);
    } catch (err) {
      console.error('[VideoCall] start failed:', err);
      await stopAudioSession();
      setConnectionState('error');
      setError(
        err instanceof Error ? err.message : 'Could not start the video call',
      );
    }
  }, [patientId, permissions, room, stopAudioSession]);

  const endCall = useCallback(async () => {
    const sessionId = activeCall?.sessionId;

    try {
      await room.disconnect();
    } catch (err) {
      console.warn('[VideoCall] disconnect failed:', err);
    }

    await stopAudioSession();
    setActiveCall(null);
    setConnectionState('idle');
    setElapsedSeconds(0);
    setMinimized(false);
    setSheetPresented(false);

    if (!sessionId) return;

    // Best-effort: revokes the invite immediately. The log itself is closed out
    // by the LiveKit webhook whether or not this request lands.
    try {
      const authToken = await getStoredToken();
      await fetch(getApiUrl('/video-call/end'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.warn('[VideoCall] end notification failed:', err);
    }
  }, [activeCall, room, stopAudioSession]);

  const toggleMic = useCallback(async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
    } catch (err) {
      console.warn('[VideoCall] toggle mic failed:', err);
      setMicEnabled(!next);
    }
  }, [micEnabled, room]);

  const toggleCamera = useCallback(async () => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    try {
      await room.localParticipant.setCameraEnabled(next);
    } catch (err) {
      console.warn('[VideoCall] toggle camera failed:', err);
      setCameraEnabled(!next);
    }
  }, [cameraEnabled, room]);

  const switchCamera = useCallback(async () => {
    const next = facingMode.current === 'user' ? 'environment' : 'user';
    try {
      const track = Array.from(
        room.localParticipant.videoTrackPublications.values(),
      )[0]?.track as LocalVideoTrack | undefined;

      await track?.restartTrack({ facingMode: next });
      facingMode.current = next;
    } catch (err) {
      console.warn('[VideoCall] switch camera failed:', err);
    }
  }, [room]);

  const clearError = useCallback(() => setError(null), []);

  const photos = usePhotoCapture({
    room,
    patientId,
    sessionId: activeCall?.sessionId ?? null,
    onPhotosChanged,
  });

  const { user } = useAuth();

  // On-device transcription requires BOTH the clinician's opt-in (a setting)
  // and the patient's consent for this specific call (a data-channel
  // handshake). Either one absent means nothing is recorded.
  const { mode: transcriptionMode } = useCallTranscriptionMode();
  const consented =
    transcriptionMode !== 'off' && patientConsent === 'granted';

  const recording = useCallRecording({
    // Live mode never records to disk — the two share the same native ring
    // buffers, so running both would have each stealing half the other's audio.
    enabled: transcriptionMode === 'post_call' && consented,
    isConnected: connectionState === 'connected',
    sessionId: activeCall?.sessionId ?? null,
    patientId,
    patientName,
    patientEmail: patientEmail ?? '',
    doctorLocale: 'en-US',
    patientLocale: languageToBcp47(patientLanguage),
    patientLanguageName: patientLanguage,
    authorId: user?.id,
    authorName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined
      : undefined,
  });

  const captions = useLiveCaptions({
    enabled: transcriptionMode === 'live' && consented,
    isConnected: connectionState === 'connected',
    doctorLocale: 'en-US',
    patientLocale: languageToBcp47(patientLanguage),
  });

  // Live mode still leaves the same artifact in the chart as post-call: one
  // Patient Call note, written from the finalized captions at hang-up.
  useLiveTranscriptNote({
    active: transcriptionMode === 'live' && consented,
    isConnected: connectionState === 'connected',
    sessionId: activeCall?.sessionId ?? null,
    patientId,
    patientEmail: patientEmail ?? '',
    doctorLocale: 'en-US',
    patientLocale: languageToBcp47(patientLanguage),
    authorId: user?.id,
    authorName: user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined
      : undefined,
    takeSegments: captions.takeSegments,
  });

  const value = useMemo<VideoCallSessionValue>(
    () => ({
      room,
      patientId,
      patientName,
      photos,
      recording,
      captions,
      patientConsent,
      connectionState,
      activeCall,
      error,
      elapsedSeconds,
      micEnabled,
      cameraEnabled,
      isMinimized,
      setMinimized,
      sheetPresented,
      setSheetPresented,
      reopenRequestId,
      requestReopen,
      startCall,
      endCall,
      toggleMic,
      toggleCamera,
      switchCamera,
      clearError,
    }),
    [
      room,
      patientId,
      recording,
      captions,
      patientConsent,
      patientName,
      photos,
      connectionState,
      activeCall,
      error,
      elapsedSeconds,
      micEnabled,
      cameraEnabled,
      isMinimized,
      sheetPresented,
      reopenRequestId,
      requestReopen,
      startCall,
      endCall,
      toggleMic,
      toggleCamera,
      switchCamera,
      clearError,
    ],
  );

  return (
    <VideoCallSessionContext.Provider value={value}>
      {children}
    </VideoCallSessionContext.Provider>
  );
};

export default VideoCallSessionProvider;
