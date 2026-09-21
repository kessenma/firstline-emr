import type { VideoCallStatus } from './types';

/**
 * How long a patient invite link stays valid. Long enough to text it over and
 * have the patient find it, short enough that a leaked link isn't a standing
 * key to a room containing PHI.
 */
export const VIDEO_CALL_INVITE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/** LiveKit access-token lifetime, in seconds. Matches the invite TTL. */
export const VIDEO_CALL_TOKEN_TTL_S = 2 * 60 * 60;

/** Room names are `patient-{patientId}-{suffix}` — see buildRoomName(). */
export const VIDEO_CALL_ROOM_PREFIX = 'patient';

/** Length of the random suffix appended to a room name. */
export const VIDEO_CALL_ROOM_SUFFIX_LENGTH = 8;

/**
 * Consults are 1:1. Kept in sync with `room.max_participants` in
 * apps/livekit-server/config.yaml — the server enforces it; this is for UI.
 */
export const VIDEO_CALL_MAX_PARTICIPANTS = 2;

/** LiveKit identity prefix for the patient side, used by the webhook handler. */
export const VIDEO_CALL_PATIENT_IDENTITY_PREFIX = 'patient-';

export const VIDEO_CALL_STATUS_LABELS: Record<VideoCallStatus, string> = {
  pending: 'Not started',
  active: 'In progress',
  completed: 'Completed',
  missed: 'No answer',
  expired: 'Expired',
};
