// Shared video-call types.
//
// Deliberately free of React and of any LiveKit import: web renders with
// @livekit/components-react and mobile with @livekit/react-native, which are
// different libraries with different primitives. Only types, constants, and
// pure logic can be shared here — components cannot.

/** Mirrors the `video_call_status` pgEnum in apps/web/db/schema. */
export type VideoCallStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'missed'
  | 'expired';

/**
 * A call-log entry as exposed to clients.
 *
 * Note there is no `inviteToken` — the join credential is never sent to a
 * history consumer, and is excluded from PowerSync entirely.
 */
export interface VideoCallSession {
  id: string;
  patientId: string;
  roomName: string;
  startedById: string | null;
  startedByName: string | null;
  status: VideoCallStatus;
  createdAt: string;
  startedAt: string | null;
  patientJoinedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  endedReason: string | null;
  callNotes: string | null;
}

/** Response from POST /api/video-call/start (staff auth required). */
export interface StartCallResponse {
  sessionId: string;
  roomName: string;
  /** LiveKit SFU websocket URL, e.g. wss://livekit.fajrmission.org */
  serverUrl: string;
  /** Staff access token — publish + subscribe. */
  token: string;
  /** Shareable link for the patient, already fully qualified. */
  inviteUrl: string;
  /**
   * The patient's recorded language, normalized to a full English name. Sent so
   * the clinician's app can compose the Telegram invite in it — see
   * buildInviteMessage().
   */
  language: string;
  expiresAt: string;
}

/** Response from POST /api/video-call/join (public, invite-gated). */
export interface JoinCallResponse {
  roomName: string;
  serverUrl: string;
  token: string;
  /** Display name of the clinician who started the call, for the join screen. */
  hostName: string | null;
  /**
   * The patient's recorded language, normalized to a full English name
   * ("Arabic", "Farsi", …). Authoritative over the `?lang=` query param, which
   * only exists to translate the states rendered before this response arrives.
   */
  language: string;
  /**
   * Whether the patient has already agreed to photo capture on this call.
   * Sent so a patient who reloads mid-call is not asked a second time.
   */
  /** True when the clinician has transcription enabled, so the patient should
   *  be asked. False means never show the prompt. */
  transcriptionOffered?: boolean;
  /** Their answer on a previous load of this same call, if any. */
  transcriptionConsent?: 'granted' | 'declined' | 'withdrawn' | null;
  photoConsentGranted: boolean;
}

/** Connection lifecycle, normalized across the two client SDKs. */
export type VideoCallConnectionState =
  | 'idle'
  | 'requesting-permissions'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

/** Aggregate shown on the mobile dashboard card / web section header. */
export interface CallHistorySummary {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  lastCallAt: string | null;
}
