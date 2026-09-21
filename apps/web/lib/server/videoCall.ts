// lib/server/videoCall.ts
//
// Server-only helpers for LiveKit video consults: config resolution, token
// minting, and random identifier generation.
//
// Token minting lives here rather than in the routes so the grants stay
// consistent between the staff and patient sides — the previous implementation
// issued `{ roomJoin: true, room }` with no TTL and no publish/subscribe
// grants, from an endpoint that required no authentication at all.
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { db } from "@/db";
import { videoCallSessions } from "@/db/schema";
import {
  PHOTO_CAPTURE_TOKEN_TTL_S,
  VIDEO_CALL_ROOM_SUFFIX_LENGTH,
  VIDEO_CALL_TOKEN_TTL_S,
  buildPatientIdentity,
  isInviteExpired,
  staffDisplayName,
} from "@fajr/shared/video-call";

export interface LiveKitConfig {
  apiKey: string;
  apiSecret: string;
  /** wss:// URL the browser/app connects to. */
  serverUrl: string;
}

/**
 * Resolve LiveKit credentials. Throws rather than returning a half-configured
 * object — a silently missing secret would mint tokens the SFU rejects, which
 * surfaces as an opaque client-side connection failure.
 */
export function getLiveKitConfig(): LiveKitConfig {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl =
    process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

  const missing = [
    !apiKey && "LIVEKIT_API_KEY",
    !apiSecret && "LIVEKIT_API_SECRET",
    !serverUrl && "NEXT_PUBLIC_LIVEKIT_URL",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`LiveKit is not configured: missing ${missing.join(", ")}`);
  }

  return {
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    serverUrl: serverUrl!,
  };
}

/**
 * Close a room on the SFU, disconnecting everyone still in it.
 *
 * Revoking the invite only stops the *next* join — a patient who is already
 * connected has a valid token and stays in an empty room until it expires,
 * watching a frozen "waiting" screen with no idea the consult is over. This is
 * what actually ends the call for them: LiveKit drops every participant with
 * DisconnectReason.ROOM_DELETED, which the patient page renders as "the doctor
 * ended the call".
 *
 * Best-effort by design. The caller has already recorded the end in the
 * database, and the LiveKit webhook closes out the log independently, so a
 * failure here must not fail the request — it degrades to the old behaviour.
 */
export async function closeLiveKitRoom(roomName: string): Promise<void> {
  try {
    const config = getLiveKitConfig();
    // RoomServiceClient speaks HTTP; the configured URL is the client-facing
    // websocket one. Same host, same port — only the scheme differs.
    const httpUrl = config.serverUrl.replace(/^ws(s?):\/\//, "http$1://");
    const client = new RoomServiceClient(
      httpUrl,
      config.apiKey,
      config.apiSecret,
    );
    await client.deleteRoom(roomName);
  } catch (error) {
    // A room that already finished (both sides hung up, empty_timeout fired)
    // is a 404 here, and is not a problem — it is already in the state we want.
    console.warn(`[video-call] could not close room ${roomName}:`, error);
  }
}

/** Origin used to build patient invite links. */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://fajrmission.org"
  );
}

/** 64 hex chars. Same shape as the telegram intake tokens. */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

/** Short random suffix that makes a room name unique per call. */
export function generateRoomSuffix(): string {
  return randomBytes(VIDEO_CALL_ROOM_SUFFIX_LENGTH)
    .toString("hex")
    .slice(0, VIDEO_CALL_ROOM_SUFFIX_LENGTH);
}

async function mintToken(params: {
  config: LiveKitConfig;
  roomName: string;
  identity: string;
  name: string;
  ttlSeconds: number;
}): Promise<string> {
  const { config, roomName, identity, name, ttlSeconds } = params;

  const at = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    ttl: ttlSeconds,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}

/** Token for the clinician who started the call. Identity is their user id. */
export function mintStaffToken(params: {
  config: LiveKitConfig;
  roomName: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  ttlSeconds?: number;
}): Promise<string> {
  return mintToken({
    config: params.config,
    roomName: params.roomName,
    identity: params.userId,
    name: staffDisplayName({
      firstName: params.firstName,
      lastName: params.lastName,
    }),
    ttlSeconds: params.ttlSeconds ?? VIDEO_CALL_TOKEN_TTL_S,
  });
}

// ─── Invite-token session lookup ─────────────────────────────────────────────

export type InviteLookupFailure = "invalid" | "ended";

/**
 * Resolve a patient's invite token to a live call session.
 *
 * Every session-less patient endpoint needs the same four checks — shape,
 * existence, revocation, expiry — and they have to fail the same way each time.
 * In particular "no such token" and "malformed token" must be indistinguishable
 * to the caller, or the endpoint becomes an oracle for which tokens exist.
 *
 * Returns a discriminated result rather than throwing, so routes can map the
 * two failure kinds onto their own status codes (400 vs 410).
 */
export async function resolveInviteSession(inviteToken: unknown): Promise<
  | { ok: true; session: VideoCallSessionRow }
  | { ok: false; reason: InviteLookupFailure }
> {
  if (typeof inviteToken !== "string" || !/^[0-9a-f]{64}$/i.test(inviteToken)) {
    return { ok: false, reason: "invalid" };
  }

  const session = await db.query.videoCallSessions.findFirst({
    where: eq(videoCallSessions.inviteToken, inviteToken),
    columns: {
      id: true,
      patientId: true,
      startedById: true,
      isRevoked: true,
      status: true,
      expiresAt: true,
      photoConsentAt: true,
    },
  });

  if (!session) return { ok: false, reason: "invalid" };

  if (session.isRevoked || session.status === "expired") {
    return { ok: false, reason: "ended" };
  }

  if (isInviteExpired(session.expiresAt)) {
    return { ok: false, reason: "ended" };
  }

  return { ok: true, session };
}

interface VideoCallSessionRow {
  id: string;
  patientId: string;
  startedById: string | null;
  isRevoked: boolean;
  status: string;
  expiresAt: Date;
  photoConsentAt: Date | null;
}

// ─── Photo capture tokens ────────────────────────────────────────────────────
//
// A capture token is the credential the *patient's* browser presents when it
// uploads a still to the chart. It exists because the patient has no session,
// and authenticating that upload with the invite token alone would mean anyone
// holding the two-hour Telegram link could write images into a patient's
// record. Only an authenticated clinician can mint one, it names exactly one
// call session, and it expires in 90 seconds.

const CAPTURE_TOKEN_TYPE = "consult-photo-capture";

export interface CaptureTokenClaims {
  typ: typeof CAPTURE_TOKEN_TYPE;
  /** video_call_sessions.id */
  sid: string;
  /** patients.id — carried so the upload never trusts a client-supplied id. */
  pid: string;
  /** The clinician who asked for the capture. */
  uid: string;
}

function captureTokenSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Photo capture is not configured: JWT_SECRET / NEXTAUTH_SECRET missing",
    );
  }
  return secret;
}

/** Mint a single-purpose upload credential for one capture. */
export function mintCaptureToken(params: {
  sessionId: string;
  patientId: string;
  userId: string;
}): string {
  const claims: CaptureTokenClaims = {
    typ: CAPTURE_TOKEN_TYPE,
    sid: params.sessionId,
    pid: params.patientId,
    uid: params.userId,
  };

  return jwt.sign(claims, captureTokenSecret(), {
    expiresIn: PHOTO_CAPTURE_TOKEN_TTL_S,
  });
}

/**
 * Verify a capture token. Returns null for anything that isn't a currently
 * valid one — expired, tampered, or a different kind of token entirely.
 *
 * The `typ` check matters: without it, any of the app's 30-day mobile auth
 * tokens would be accepted here, turning a 90-second single-purpose credential
 * into a month-long one.
 */
export function verifyCaptureToken(token: string): CaptureTokenClaims | null {
  try {
    const decoded = jwt.verify(token, captureTokenSecret()) as
      | Partial<CaptureTokenClaims>
      | string;

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      decoded.typ !== CAPTURE_TOKEN_TYPE ||
      !decoded.sid ||
      !decoded.pid ||
      !decoded.uid
    ) {
      return null;
    }

    return decoded as CaptureTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Token for the patient side. Identity is prefixed so the webhook handler can
 * tell a patient join from a staff join without a database lookup.
 */
export function mintPatientToken(params: {
  config: LiveKitConfig;
  roomName: string;
  patientId: string;
  displayName: string;
  ttlSeconds?: number;
}): Promise<string> {
  return mintToken({
    config: params.config,
    roomName: params.roomName,
    identity: buildPatientIdentity(params.patientId),
    name: params.displayName,
    ttlSeconds: params.ttlSeconds ?? VIDEO_CALL_TOKEN_TTL_S,
  });
}
