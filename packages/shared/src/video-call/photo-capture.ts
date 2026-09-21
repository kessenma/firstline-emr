// packages/shared/src/video-call/photo-capture.ts
//
// Protocol for capturing a still frame during a patient consult.
//
// The capture happens on the *patient's* browser, not the clinician's. That is
// not a stylistic choice: the React Native WebRTC layer exposes no way to read
// pixels out of a video track, so a doctor on mobile has no frame to grab. Ask
// the patient's page to photograph itself and both platforms work identically,
// with no native code — and the image skips the video codec entirely, so it is
// cleaner than what the clinician is watching.
//
// Transport is LiveKit RPC rather than raw data packets: it gives request /
// response, a timeout, and a typed error taxonomy (RECIPIENT_DISCONNECTED,
// UNSUPPORTED_METHOD) that maps directly onto what the clinician needs told.
//
// This file must stay free of React and LiveKit imports — mobile pulls it in
// alongside @livekit/react-native, web alongside @livekit/components-react.

/** Clinician → patient: ask permission to save photos during this call. */
export const PHOTO_CONSENT_RPC = 'consult.photo.requestConsent';

/** Clinician → patient: take a photo now. Only valid once consent is granted. */
export const PHOTO_CAPTURE_RPC = 'consult.photo.capture';

/** Either direction: a photo was deleted, drop it from your filmstrip. */
export const PHOTO_REMOVED_RPC = 'consult.photo.removed';

/**
 * Long, because a human has to read a modal and tap. The clinician's UI shows a
 * pending state for the duration; the server records the answer independently,
 * so a timeout here loses the notification, not the consent.
 */
export const PHOTO_CONSENT_TIMEOUT_MS = 60_000;

/** Covers a canvas encode plus an upload of a ~300 KB JPEG on a poor uplink. */
export const PHOTO_CAPTURE_TIMEOUT_MS = 30_000;

/** Rejected server-side above this. A 1080p JPEG is ~200-500 KB. */
export const PHOTO_CAPTURE_MAX_BYTES = 8 * 1024 * 1024;

/** JPEG quality for the captured still. High: this is a clinical image. */
export const PHOTO_CAPTURE_JPEG_QUALITY = 0.92;

export const PHOTO_CAPTURE_CONTENT_TYPE = 'image/jpeg';

/** Lifetime of the single-use token that authorizes one upload. */
export const PHOTO_CAPTURE_TOKEN_TTL_S = 90;

export interface PhotoConsentRequest {
  v: 1;
  /** Shown in the prompt so the patient knows who is asking. */
  requestedBy: string;
}

export interface PhotoConsentResponse {
  v: 1;
  granted: boolean;
}

export interface PhotoCaptureRequest {
  v: 1;
  /**
   * Short-lived JWT minted for an authenticated clinician. Without it the
   * upload endpoint would be authenticated by the invite token alone — and
   * that link is sent over Telegram and lives for two hours, so anyone holding
   * it could push arbitrary images into a patient's chart.
   */
  captureToken: string;
}

export interface PhotoCaptureResponse {
  v: 1;
  /** `patient_media.id` — what a subsequent delete addresses. */
  mediaId: string;
  /** Storage key. The clinician's client signs it through its own auth. */
  filePath: string;
  width: number;
  height: number;
}

export interface PhotoRemovedNotice {
  v: 1;
  mediaId: string;
}

/** One capture, as tracked by whichever side is showing a filmstrip. */
export interface CapturedPhoto {
  mediaId: string;
  filePath: string;
  /** Resolved signed URL, or a local object URL on the device that took it. */
  url: string;
  capturedAt: string;
}

/**
 * Clinician-side capture state.
 *
 * `denied` is distinct from `unconsented` so the button can say "ask again"
 * rather than silently offering the same prompt that was just refused.
 */
export type PhotoCaptureStatus =
  | 'unconsented'
  | 'requesting'
  | 'denied'
  | 'armed'
  | 'capturing';

/**
 * Why a capture failed, in terms the clinician can act on. Derived from
 * LiveKit's RpcError codes plus our own upload failures.
 */
export type PhotoCaptureFailure =
  | 'patient-disconnected'
  | 'patient-outdated'
  | 'camera-off'
  | 'timeout'
  | 'upload-failed'
  | 'unknown';

/** User-facing copy for the clinician. The patient's side is translated. */
export const PHOTO_CAPTURE_FAILURE_MESSAGE: Record<
  PhotoCaptureFailure,
  string
> = {
  'patient-disconnected':
    "The patient isn't connected right now, so no photo could be taken.",
  'patient-outdated':
    "The patient's call page is out of date. Ask them to reload the link.",
  'camera-off': "The patient's camera isn't sending video.",
  timeout: "The patient's device didn't respond in time.",
  'upload-failed': 'The photo was taken but could not be saved. Try again.',
  unknown: 'The photo could not be taken.',
};

/**
 * Reason strings the patient's handler puts in an RpcError message.
 *
 * They travel in the *message*, not the code: LiveKit reserves codes 1001-1999
 * for its own errors, and reusing one would make the clinician's client
 * misread an app failure as a transport failure — throwing 1400 for
 * "unauthorized", for instance, is indistinguishable from UNSUPPORTED_METHOD
 * and would tell the clinician to have the patient reload a page that is fine.
 * Application errors therefore all carry code 1500 and are told apart here.
 */
export const PHOTO_RPC_REASON = {
  UNAUTHORIZED: 'unauthorized',
  CONSENT_NOT_GRANTED: 'consent-not-granted',
  CAMERA_OFF: 'camera-off',
  UPLOAD_FAILED: 'upload-failed',
} as const;

/** LiveKit's built-in RpcError codes, duplicated to keep this file SDK-free. */
const RPC_CODE = {
  APPLICATION_ERROR: 1500,
  RESPONSE_TIMEOUT: 1502,
  RECIPIENT_DISCONNECTED: 1503,
  UNSUPPORTED_METHOD: 1400,
  RECIPIENT_NOT_FOUND: 1401,
} as const;

/**
 * Turn whatever came back from `performRpc` into something the clinician can
 * be told. Accepts an unknown so callers don't have to narrow first.
 */
export function photoCaptureFailureFrom(error: unknown): PhotoCaptureFailure {
  const code = (error as { code?: number } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? '';

  switch (code) {
    case RPC_CODE.RECIPIENT_DISCONNECTED:
    case RPC_CODE.RECIPIENT_NOT_FOUND:
      return 'patient-disconnected';
    // The patient is on a page built before this feature shipped, so it never
    // registered a handler. Only possible inside the 2h invite window after a
    // deploy.
    case RPC_CODE.UNSUPPORTED_METHOD:
      return 'patient-outdated';
    case RPC_CODE.RESPONSE_TIMEOUT:
      return 'timeout';
    case RPC_CODE.APPLICATION_ERROR:
      if (message === PHOTO_RPC_REASON.CAMERA_OFF) return 'camera-off';
      if (message === PHOTO_RPC_REASON.UPLOAD_FAILED) return 'upload-failed';
      return 'unknown';
    default:
      return 'unknown';
  }
}
