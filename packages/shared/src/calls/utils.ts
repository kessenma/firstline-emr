// packages/shared/src/calls/utils.ts
// Display helpers for call UIs. Pure formatting — no platform APIs.

import type { CallRecent } from './types';

export function displayName(u: {
  firstName: string;
  lastName: string;
}): string {
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
}

export function initialsOf(u: {
  firstName: string;
  lastName: string;
}): string {
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
}

/** Seconds → m:ss (or h:mm:ss past an hour). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Compact relative timestamp for a Recents list. */
export function formatCallTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Whether a history row should read as a missed call.
 *
 * Both halves matter: `status` covers a call nobody answered, while `myStatus`
 * catches the case where someone else picked up on a group call but this user
 * never did.
 */
export function isMissedCall(call: CallRecent): boolean {
  return (
    call.status === 'missed' ||
    (call.direction === 'incoming' && call.myStatus === 'missed')
  );
}
