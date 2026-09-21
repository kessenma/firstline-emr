// lib/calls.ts
// Shared helpers for staff-to-staff calling: room naming, scoped LiveKit token
// minting, callee reachability evaluation, and the recents query.

import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { db } from "@/db";
import {
  calls,
  callParticipants,
  users,
  userSettings,
  pushDevices,
} from "@/db/schema";
import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { isInQuietHours, formatQuietHoursEnd } from "./quietHours";
import { notificationService } from "./NotificationService";
import {
  addMessageToInternalThread,
  createGroupThread,
  findExistingGroupThread,
  getOrCreateDirectThread,
} from "./internal-messages-helpers";
import type { CallSummaryPayload } from "@fajr/shared/calls";

// ---------------------------------------------------------------------------
// Room naming
// ---------------------------------------------------------------------------

// Staff call rooms are keyed on the call's uuid. Patient consult rooms use a
// separate prefix and are owned by the video-call feature — they are created
// and joined through /api/video-call/*, which gates access on a single-purpose
// invite token. /api/livekit/webhook uses this prefix to ignore them.
export const STAFF_ROOM_PREFIX = "staff-";
export const PATIENT_ROOM_PREFIX = "patient-";

export function staffRoomName(callId: string): string {
  return `${STAFF_ROOM_PREFIX}${callId}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isPatientRoomName(roomName: string): boolean {
  if (!roomName.startsWith(PATIENT_ROOM_PREFIX)) return false;
  return isValidUuid(roomName.slice(PATIENT_ROOM_PREFIX.length));
}

// ---------------------------------------------------------------------------
// Token minting
// ---------------------------------------------------------------------------

export function livekitServerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || ""
  );
}

/**
 * Same host as livekitServerUrl(), over http(s) instead of ws(s).
 *
 * The client-facing URL is a WebSocket endpoint, but RoomServiceClient speaks
 * the Twirp HTTP API. Passing it a `wss://` URL fails at request time rather
 * than at construction, so normalise here.
 */
export function livekitApiUrl(): string {
  return livekitServerUrl().replace(/^ws/, "http");
}

/**
 * Pre-create a staff call room with its own participant cap.
 *
 * The server default in apps/livekit-server/config.yaml is 2, sized for 1:1
 * patient consults. Staff calls can have more than two people, and because
 * `room.auto_create` is on, a room conjured by the first joiner would silently
 * inherit that default and start rejecting the third participant. Creating the
 * room up front is what makes the cap per-room instead of global — see the
 * `max_participants` comment in config.yaml.
 *
 * Best-effort: a failure here is logged and swallowed. The room would still be
 * auto-created on join, so a group call degrades to a 2-person cap rather than
 * failing to connect at all — and the caller has already been handed a token.
 */
export async function ensureStaffRoom(opts: {
  roomName: string;
  /** Everyone invited, including the caller. */
  participantCount: number;
}): Promise<void> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = livekitApiUrl();
  if (!apiKey || !apiSecret || !url) {
    console.error("ensureStaffRoom: LiveKit is not configured");
    return;
  }

  // One slot of headroom: switching devices mid-call briefly leaves the old
  // session connected while the new one joins, and LiveKit counts both until
  // it drops the duplicate identity.
  const maxParticipants = opts.participantCount + 1;

  try {
    const svc = new RoomServiceClient(url, apiKey, apiSecret);
    await svc.createRoom({
      name: opts.roomName,
      maxParticipants,
      // Match room.empty_timeout in config.yaml so an abandoned room is not
      // left joinable on a leaked token.
      emptyTimeout: 30,
    });
  } catch (error) {
    console.error(
      `ensureStaffRoom: could not pre-create ${opts.roomName}; ` +
        `falling back to the server default participant cap`,
      error,
    );
  }
}

/**
 * Mint a LiveKit token scoped to one room and one authenticated user.
 *
 * The TTL gates *joining* only — an in-progress session survives past expiry —
 * so a short window costs nothing and limits replay if a token leaks.
 *
 * `identity` is the user's uuid rather than a display name: LiveKit disconnects
 * an older session when a second one joins with the same identity, which is the
 * behaviour we want when someone answers on a second device.
 */
export async function mintStaffCallToken(opts: {
  roomName: string;
  userId: string;
  displayName: string;
  kind?: "audio" | "video";
}): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not configured");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.userId,
    name: opts.displayName,
    ttl: "10m",
  });

  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Audio-only is enforced here, server-side, rather than trusted to the
    // client. Adding video later means widening this list.
    canPublishSources:
      opts.kind === "video"
        ? [TrackSource.CAMERA, TrackSource.MICROPHONE]
        : [TrackSource.MICROPHONE],
    canUpdateOwnMetadata: false,
    roomCreate: false,
    roomAdmin: false,
  });

  return at.toJwt();
}

// ---------------------------------------------------------------------------
// Callee evaluation
// ---------------------------------------------------------------------------

export interface CalleeEvaluation {
  id: string;
  name: string;
  /** notify_calls is on AND the master push toggle is on */
  notificationsAllowed: boolean;
  /** has at least one active PushKit token registered */
  hasVoipDevice: boolean;
  /** currently inside their configured quiet-hours window */
  inQuietHours: boolean;
  /** local end of the quiet-hours window, for the caller's confirm prompt */
  quietHoursEnd: string | null;
}

/**
 * Resolve, for each callee, whether we can ring them and whether doing so would
 * interrupt their quiet hours.
 *
 * Two distinct outcomes the caller UI must not conflate:
 *   - notificationsAllowed=false or hasVoipDevice=false → "not reachable",
 *     NOT overridable.
 *   - inQuietHours=true → overridable after the caller explicitly confirms.
 */
export async function evaluateCallees(
  calleeIds: string[],
): Promise<CalleeEvaluation[]> {
  if (calleeIds.length === 0) return [];

  const [rows, settingsRows, voipRows] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, calleeIds)),

    db
      .select({
        userId: userSettings.userId,
        pushNotificationsEnabled: userSettings.pushNotificationsEnabled,
        notifyCalls: userSettings.notifyCalls,
        quietHoursEnabled: userSettings.quietHoursEnabled,
        quietHoursStart: userSettings.quietHoursStart,
        quietHoursEnd: userSettings.quietHoursEnd,
        quietHoursTimezone: userSettings.quietHoursTimezone,
      })
      .from(userSettings)
      .where(inArray(userSettings.userId, calleeIds)),

    db
      .selectDistinct({ userId: pushDevices.userId })
      .from(pushDevices)
      .where(
        and(
          inArray(pushDevices.userId, calleeIds),
          eq(pushDevices.platform, "ios_voip"),
          eq(pushDevices.isActive, true),
        ),
      ),
  ]);

  const settingsMap = new Map(settingsRows.map((s) => [s.userId, s]));
  const voipSet = new Set(voipRows.map((r) => r.userId).filter(Boolean));

  return rows.map((u) => {
    const s = settingsMap.get(u.id);
    // No settings row means defaults, which are all-enabled.
    const notificationsAllowed = s
      ? s.pushNotificationsEnabled !== false && s.notifyCalls !== false
      : true;

    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      notificationsAllowed,
      hasVoipDevice: voipSet.has(u.id),
      inQuietHours: s ? isInQuietHours(s) : false,
      quietHoursEnd: s ? formatQuietHoursEnd(s) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Terminal status resolution
// ---------------------------------------------------------------------------

export type CallStatus = (typeof calls.$inferSelect)["status"];

/**
 * Decide the final status of a call that is being torn down.
 *
 * `answered` is whether anyone ever accepted — that is what separates a
 * completed call from one that was cancelled or missed.
 */
export function resolveTerminalStatus(opts: {
  answered: boolean;
  reason?: string | null;
  everyCalleeDeclined: boolean;
}): { status: CallStatus; endReason: string } {
  if (opts.answered) {
    return { status: "completed", endReason: opts.reason || "hangup" };
  }
  if (opts.everyCalleeDeclined) {
    return { status: "declined", endReason: "declined" };
  }
  if (opts.reason === "timeout") {
    return { status: "missed", endReason: "timeout" };
  }
  // Caller gave up before anyone answered.
  return { status: "canceled", endReason: opts.reason || "canceled" };
}

// ---------------------------------------------------------------------------
// Recents
// ---------------------------------------------------------------------------

export interface CallRecent {
  callId: string;
  kind: "audio" | "video";
  status: CallStatus;
  direction: "incoming" | "outgoing";
  myStatus: (typeof callParticipants.$inferSelect)["status"];
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  counterparties: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    image: string | null;
    accountType: string;
  }>;
}

/**
 * Page one user's call history, newest first.
 *
 * Sorts on call_participants(user_id, invited_at) — invited_at is denormalized
 * from calls.started_at precisely so this index can serve the sort without
 * joining calls first. The counterparties are hydrated in a second round-trip,
 * mirroring getThreadParticipantsWithUserData in internal-messages-helpers.ts.
 */
export async function getCallHistory(opts: {
  userId: string;
  limit?: number;
  /** ISO timestamp; returns calls strictly older than this */
  cursor?: string | null;
}): Promise<{ calls: CallRecent[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);

  const conditions = [eq(callParticipants.userId, opts.userId)];
  if (opts.cursor) {
    const cursorDate = new Date(opts.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      conditions.push(lt(callParticipants.invitedAt, cursorDate));
    }
  }

  const page = await db
    .select({
      callId: calls.id,
      kind: calls.kind,
      status: calls.status,
      initiatorId: calls.initiatorId,
      startedAt: calls.startedAt,
      answeredAt: calls.answeredAt,
      endedAt: calls.endedAt,
      durationSeconds: calls.durationSeconds,
      myStatus: callParticipants.status,
      invitedAt: callParticipants.invitedAt,
    })
    .from(callParticipants)
    .innerJoin(calls, eq(calls.id, callParticipants.callId))
    .where(and(...conditions))
    .orderBy(desc(callParticipants.invitedAt))
    .limit(limit + 1); // one extra row tells us whether another page exists

  const hasMore = page.length > limit;
  const rows = hasMore ? page.slice(0, limit) : page;

  if (rows.length === 0) {
    return { calls: [], nextCursor: null };
  }

  const callIds = rows.map((r) => r.callId);
  const others = await db
    .select({
      callId: callParticipants.callId,
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      // Selected so a Recents row can show the same identifying line as a
      // Contacts row — otherwise the directory builds a DirectoryUser with an
      // empty email and the two tabs look inconsistent.
      email: users.email,
      image: users.image,
      accountType: users.accountType,
    })
    .from(callParticipants)
    .innerJoin(users, eq(users.id, callParticipants.userId))
    .where(
      and(
        inArray(callParticipants.callId, callIds),
        ne(callParticipants.userId, opts.userId),
      ),
    );

  const byCall = new Map<string, CallRecent["counterparties"]>();
  for (const o of others) {
    const list = byCall.get(o.callId) ?? [];
    list.push({
      id: o.id,
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      image: o.image,
      accountType: o.accountType,
    });
    byCall.set(o.callId, list);
  }

  return {
    calls: rows.map((r) => ({
      callId: r.callId,
      kind: r.kind,
      status: r.status,
      direction: r.initiatorId === opts.userId ? "outgoing" : "incoming",
      myStatus: r.myStatus,
      startedAt: r.startedAt,
      answeredAt: r.answeredAt,
      endedAt: r.endedAt,
      durationSeconds: r.durationSeconds,
      counterparties: byCall.get(r.callId) ?? [],
    })),
    nextCursor: hasMore
      ? rows[rows.length - 1].invitedAt.toISOString()
      : null,
  };
}

/**
 * Load a call plus the requesting user's participant row, or null if they were
 * never invited. Every lifecycle route starts here — it is both the fetch and
 * the authorization check.
 */
export async function getCallForParticipant(callId: string, userId: string) {
  const [row] = await db
    .select({
      call: calls,
      participant: callParticipants,
    })
    .from(callParticipants)
    .innerJoin(calls, eq(calls.id, callParticipants.callId))
    .where(
      and(
        eq(callParticipants.callId, callId),
        eq(callParticipants.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/** Count callees still ringing on a call, excluding a user being resolved now. */
export async function countRingingCallees(
  callId: string,
  excludeUserId?: string,
): Promise<number> {
  const conditions = [
    eq(callParticipants.callId, callId),
    eq(callParticipants.role, "callee"),
    eq(callParticipants.status, "ringing"),
  ];
  if (excludeUserId) {
    conditions.push(ne(callParticipants.userId, excludeUserId));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(callParticipants)
    .where(and(...conditions));

  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Missed-call notification
// ---------------------------------------------------------------------------

/**
 * Tell people they missed a call.
 *
 * Deliberately NOT fired from the decline route: declining is a deliberate act,
 * and the decliner does not need to be told they missed what they just refused.
 * The only true miss is a participant still `ringing` when the call ends, which
 * is exactly the set /api/calls/[id]/end resolves to `missed`.
 *
 * Uses category "missed_call" rather than "call": both honour the notifyCalls
 * toggle, but only a *live* ring is exempt from quiet hours. See
 * NotificationService.getUsersWithPushEnabled.
 *
 * Best-effort — a notification failure must not fail the hang-up that produced
 * it, so the caller should not await this.
 */
export async function notifyMissedCall(opts: {
  callId: string;
  initiatorId: string;
  missedUserIds: string[];
}): Promise<void> {
  if (opts.missedUserIds.length === 0) return;

  try {
    const [caller] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, opts.initiatorId))
      .limit(1);

    const callerName = caller
      ? `${caller.firstName} ${caller.lastName}`.trim()
      : "A colleague";

    await notificationService.send({
      type: "missed_call",
      category: "missed_call",
      title: "Missed Call",
      message: `You missed a call from ${callerName}`,
      recipientIds: opts.missedUserIds,
      sourceId: opts.callId,
      // Lands on Messages, where the call-summary card for this call lives.
      redirectTo: "/messages",
    });
  } catch (error) {
    console.error("Failed to send missed-call notification:", error);
  }
}

// ---------------------------------------------------------------------------
// Call summary → staff message thread
// ---------------------------------------------------------------------------

/**
 * Drop a `call-summary` card into the staff thread for everyone on a call,
 * creating the thread if it doesn't exist yet.
 *
 * Follows the `patient-card` precedent: the payload is JSON in the message
 * `text` column and the enum value tells each client to render a card. Both
 * platforms must handle "call-summary" or the user sees raw JSON — the message
 * lists fall through to plain text for unknown types.
 *
 * `internal_messages.sender_id` is a NOT NULL FK, so there is no system sender;
 * the call initiator owns the message.
 *
 * Best-effort — a threading failure must not fail the hang-up, so callers
 * should not await this.
 */
export async function logCallToThread(opts: {
  callId: string;
  initiatorId: string;
  participantIds: string[];
  kind: "audio" | "video";
  status: CallStatus;
  startedAt: Date;
  durationSeconds: number | null;
}): Promise<void> {
  const others = opts.participantIds.filter((id) => id !== opts.initiatorId);
  // A call with nobody else on it has no thread to post into.
  if (others.length === 0) return;

  try {
    const [initiator] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, opts.initiatorId))
      .limit(1);

    const senderName = initiator
      ? `${initiator.firstName} ${initiator.lastName}`.trim()
      : "Staff";

    // 1:1 reuses the existing DM; a group call reuses an existing group thread
    // with exactly those members before creating another one.
    let threadId: string;
    if (others.length === 1) {
      const thread = await getOrCreateDirectThread(opts.initiatorId, others[0]);
      threadId = thread.id;
    } else {
      const existing = await findExistingGroupThread(opts.participantIds);
      if (existing) {
        threadId = existing.id;
      } else {
        const { thread } = await createGroupThread(opts.initiatorId, others);
        threadId = thread.id;
      }
    }

    const payload: CallSummaryPayload = {
      callId: opts.callId,
      kind: opts.kind,
      status: opts.status,
      startedAt: opts.startedAt.toISOString(),
      durationSeconds: opts.durationSeconds,
      participantIds: opts.participantIds,
      initiatorId: opts.initiatorId,
    };

    await addMessageToInternalThread(threadId, {
      text: JSON.stringify(payload),
      sender: senderName,
      senderId: opts.initiatorId,
      type: "call-summary",
    });
  } catch (error) {
    console.error("Failed to log call to thread:", error);
  }
}
