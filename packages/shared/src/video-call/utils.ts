import {
  VIDEO_CALL_PATIENT_IDENTITY_PREFIX,
  VIDEO_CALL_ROOM_PREFIX,
} from './constants';
import type { CallHistorySummary, VideoCallSession } from './types';

/**
 * Build a LiveKit room name for a patient consult.
 *
 * Patient-scoped and unique per call. The previous scheme used the clinician's
 * first name, so two doctors named Sarah shared one room and the room name
 * leaked a staff name into the URL.
 *
 * `suffix` must be supplied by the caller (server-side randomness) so this
 * function stays pure and testable.
 */
export function buildRoomName(patientId: string, suffix: string): string {
  return `${VIDEO_CALL_ROOM_PREFIX}-${patientId}-${suffix}`;
}

/** Inverse of buildRoomName(). Returns null if the name isn't ours. */
export function parseRoomName(
  roomName: string,
): { patientId: string; suffix: string } | null {
  const prefix = `${VIDEO_CALL_ROOM_PREFIX}-`;
  if (!roomName.startsWith(prefix)) return null;

  const rest = roomName.slice(prefix.length);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 0 || lastDash === rest.length - 1) return null;

  return {
    patientId: rest.slice(0, lastDash),
    suffix: rest.slice(lastDash + 1),
  };
}

/** LiveKit identity for the patient side of a call. */
export function buildPatientIdentity(patientId: string): string {
  return `${VIDEO_CALL_PATIENT_IDENTITY_PREFIX}${patientId}`;
}

/** True when a LiveKit identity belongs to the patient rather than staff. */
export function isPatientIdentity(identity: string): boolean {
  return identity.startsWith(VIDEO_CALL_PATIENT_IDENTITY_PREFIX);
}

/**
 * Fully-qualified join link for the patient.
 * `baseUrl` is the web app origin, e.g. https://fajrmission.org
 *
 * `language` is carried in the URL rather than left to the join response
 * because the page renders its connecting and error states *before* it has
 * joined anything. Without it, a patient whose link has expired reads that in
 * English — the one moment they most need to understand what happened.
 * The join response remains authoritative once it arrives.
 */
export function buildInviteUrl(
  baseUrl: string,
  inviteToken: string,
  language?: string | null,
): string {
  const origin = baseUrl.replace(/\/+$/, '');
  const url = `${origin}/call?invite=${encodeURIComponent(inviteToken)}`;
  return language ? `${url}&lang=${encodeURIComponent(language)}` : url;
}

/** Whether an invite has lapsed. `now` is injectable for testing. */
export function isInviteExpired(
  expiresAt: string | Date,
  now: Date = new Date(),
): boolean {
  const expiry =
    expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry.getTime() <= now.getTime();
}

/** "Dr. Jane Smith" — the name shown to the patient in the call UI. */
export function staffDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? `Dr. ${parts.join(' ')}` : 'Your clinician';
}

/**
 * Human-readable call duration: "8m 32s", "1h 04m", "45s".
 *
 * Rendered by both apps' call-history lists — the whole reason this module
 * exists, since a duplicated formatter drifts between platforms.
 */
export function formatCallDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(secs).padStart(2, '0')}s`;
  return `${secs}s`;
}

/** Aggregate for the dashboard card preview / section header. */
export function summarizeCallHistory(
  sessions: VideoCallSession[],
): CallHistorySummary {
  let completedCalls = 0;
  let missedCalls = 0;
  let lastCallAt: string | null = null;
  let lastCallTime = -Infinity;

  for (const session of sessions) {
    if (session.status === 'completed') completedCalls++;
    if (session.status === 'missed') missedCalls++;

    const stamp = session.startedAt || session.createdAt;
    if (!stamp) continue;

    const time = new Date(stamp).getTime();
    if (Number.isFinite(time) && time > lastCallTime) {
      lastCallTime = time;
      lastCallAt = stamp;
    }
  }

  return {
    totalCalls: sessions.length,
    completedCalls,
    missedCalls,
    lastCallAt,
  };
}
