// packages/shared/src/calls/types.ts
//
// Wire types for staff-to-staff calling, shared by web and mobile.
//
// These describe the JSON returned by /api/calls, /api/calls/recents and
// /api/users/directory — dates are ISO strings, not Date objects.
//
// Like packages/shared/src/video-call/types.ts, this module stays free of any
// LiveKit import. Both platforms hand these values to a different SDK
// (@livekit/components-react on web, @livekit/react-native on mobile), and
// pulling a client SDK in here would drag it into every consumer.

/** A staff member as returned by /api/users/directory. */
export interface DirectoryUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  image?: string | null;
  doctorSpecialty?: string[] | null;
}

/** One counterparty on a past call, from /api/calls/recents. */
export interface RecentCounterparty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  accountType: string;
}

export type CallStatus =
  | 'ringing'
  | 'active'
  | 'completed'
  | 'missed'
  | 'declined'
  | 'canceled'
  | 'failed';

export type CallDirection = 'incoming' | 'outgoing';

/** One row of call history. Dates are ISO strings over the wire. */
export interface CallRecent {
  callId: string;
  kind: 'audio' | 'video';
  status: CallStatus;
  direction: CallDirection;
  myStatus: string;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  counterparties: RecentCounterparty[];
}

/**
 * A callee the server refused to ring without confirmation because they are
 * inside their quiet-hours window. Overridable — distinct from unreachable.
 */
export interface QuietHoursCallee {
  id: string;
  name: string;
  /** Local end of their quiet-hours window, preformatted by the server. */
  until: string | null;
}

/** Per-callee reachability echoed back by POST /api/calls. */
export interface CalleeReachability {
  id: string;
  name: string;
  reachable: boolean;
}

/** Raw success body of POST /api/calls. */
export interface PlaceCallResponse {
  call: {
    id: string;
    roomName: string;
    kind: 'audio' | 'video';
    status: CallStatus;
    startedAt: string;
  };
  token: string;
  url: string;
  deliverable: boolean;
  callees: CalleeReachability[];
}

/** Everything needed to render and tear down an in-progress call. */
export interface ActiveCall {
  callId: string;
  roomName: string;
  kind: 'audio' | 'video';
  token: string;
  serverUrl: string;
  /** Who we called. Display only — the room is authoritative for who's there. */
  callee: DirectoryUser;
  /**
   * False when nobody's device will actually ring (calls disabled, or no VoIP
   * token registered). NOT the same as quiet hours, and NOT overridable — the
   * UI must say "not reachable" rather than implying a retry would help.
   */
  deliverable: boolean;
  callees: CalleeReachability[];
}

/**
 * Payload of a `call-summary` internal message.
 *
 * Stored as JSON in `internal_messages.text`, following the `patient-card`
 * precedent — the enum value tells the client to parse rather than print.
 * Both platforms MUST render it; the fallback branch in either message list
 * prints the raw text, so an unhandled type shows JSON to the user.
 */
export interface CallSummaryPayload {
  callId: string;
  kind: 'audio' | 'video';
  status: CallStatus;
  /** ISO timestamp. */
  startedAt: string;
  durationSeconds: number | null;
  /** Everyone on the call, initiator included. */
  participantIds: string[];
  initiatorId: string;
}

/** Parse a `call-summary` message body, or null if it isn't one. */
export function parseCallSummary(text: string): CallSummaryPayload | null {
  try {
    const parsed = JSON.parse(text) as Partial<CallSummaryPayload>;
    if (!parsed || typeof parsed.callId !== 'string') return null;
    return parsed as CallSummaryPayload;
  } catch {
    return null;
  }
}

/**
 * Payload carried by a VoIP push. Every value is a string: Gorush types
 * PushNotification.Data as map[string]string in Go and rejects anything else
 * with a 400 that the web client swallows.
 */
export interface VoipCallPushPayload {
  event: 'invite' | 'cancel';
  callId: string;
  callerId: string;
  callerName: string;
  /** Only present on `cancel`. */
  reason?: string;
}
