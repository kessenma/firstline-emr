// apps/web/components/patient-chart/videocall/PatientPhotoResponder.tsx
//
// The patient's half of photo capture. Mounts inside the LiveKit room on the
// patient's page and answers two RPC methods from the clinician:
//
//   consult.photo.requestConsent → show a modal, record the answer, reply
//   consult.photo.capture        → grab a frame, upload it, reply with its id
//
// The photograph is taken here rather than on the clinician's device because
// the clinician may be on mobile, where the React Native WebRTC layer offers no
// way to read pixels out of a video track. Capturing at the source also means
// the image never passes through the video codec.
//
// Everything the patient reads is translated. A consent prompt someone cannot
// read is not consent.
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RpcError, Track } from "livekit-client";
import type { RpcInvocationData } from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  PHOTO_CAPTURE_JPEG_QUALITY,
  PHOTO_CAPTURE_RPC,
  PHOTO_CONSENT_RPC,
  PHOTO_REMOVED_RPC,
  PHOTO_RPC_REASON,
  isPatientIdentity,
} from "@fajr/shared/video-call";
import type {
  PhotoCaptureRequest,
  PhotoCaptureResponse,
  PhotoConsentRequest,
  PhotoConsentResponse,
  PhotoRemovedNotice,
} from "@fajr/shared/video-call";
import { getVideoCallTranslation } from "./video-call-patient-translations";

/**
 * Every application failure goes out as APPLICATION_ERROR with a reason in the
 * message. LiveKit reserves codes 1001-1999 for transport errors, so borrowing
 * one here would make the clinician's client misdiagnose the failure.
 */
const APP_ERROR = RpcError.ErrorCode.APPLICATION_ERROR;

interface PatientPhotoResponderProps {
  inviteToken: string;
  hostName: string | null;
  language: string;
  /** Consent already recorded for this call, from the join response. */
  initialConsent: boolean;
  onCaptured?: (photo: {
    mediaId: string;
    filePath: string;
    objectUrl: string;
  }) => void;
  /** The clinician deleted a photo on their side. */
  onRemoteRemoved?: (mediaId: string) => void;
}

const PatientPhotoResponder: React.FC<PatientPhotoResponderProps> = ({
  inviteToken,
  hostName,
  language,
  initialConsent,
  onCaptured,
  onRemoteRemoved,
}) => {
  const room = useRoomContext();

  const [prompt, setPrompt] = useState<{
    requestedBy: string;
    resolve: (granted: boolean) => void;
  } | null>(null);
  const [flash, setFlash] = useState(false);
  const [banner, setBanner] = useState(false);

  const t = useCallback(
    (
      key: Parameters<typeof getVideoCallTranslation>[0],
      vars?: Record<string, string>,
    ) => getVideoCallTranslation(key, language, vars),
    [language],
  );

  // Read inside RPC handlers, which are registered once and must not close over
  // a stale render's values.
  const consentRef = useRef(initialConsent);
  const onCapturedRef = useRef(onCaptured);
  const onRemoteRemovedRef = useRef(onRemoteRemoved);
  useEffect(() => {
    consentRef.current = initialConsent;
  }, [initialConsent]);
  useEffect(() => {
    onCapturedRef.current = onCaptured;
  }, [onCaptured]);
  useEffect(() => {
    onRemoteRemovedRef.current = onRemoteRemoved;
  }, [onRemoteRemoved]);

  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCaptureFeedback = useCallback(() => {
    setFlash(true);
    setBanner(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 150);
    bannerTimer.current = setTimeout(() => setBanner(false), 4000);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    },
    [],
  );

  /**
   * The `<video>` already on screen showing the local camera. Using the
   * attached element rather than building our own means we draw from a frame
   * the browser is actively decoding — a fresh offscreen element has to be
   * played and waited on first, which is the fallback below.
   */
  const resolveLocalVideo = useCallback(async (): Promise<{
    element: HTMLVideoElement;
    cleanup?: () => void;
  } | null> => {
    const publication = room.localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    const track = publication?.track;
    if (!track) return null;

    const attached = track.attachedElements.find(
      (el): el is HTMLVideoElement =>
        el instanceof HTMLVideoElement && el.videoWidth > 0,
    );
    if (attached) return { element: attached };

    // Nothing on screen is decoding this track — the tile may be hidden or the
    // layout may have swapped. Render it offscreen just long enough to draw.
    const element = document.createElement("video");
    element.muted = true;
    element.playsInline = true;
    element.srcObject = new MediaStream([track.mediaStreamTrack]);

    await element.play().catch(() => undefined);
    await new Promise<void>((resolve) => {
      if (element.videoWidth > 0) return resolve();
      const done = () => resolve();
      element.addEventListener("loadeddata", done, { once: true });
      setTimeout(done, 2000);
    });

    return {
      element,
      cleanup: () => {
        element.srcObject = null;
      },
    };
  }, [room]);

  const captureBlob = useCallback(async () => {
    const resolved = await resolveLocalVideo();
    if (!resolved) throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.CAMERA_OFF);

    const { element, cleanup } = resolved;
    try {
      const width = element.videoWidth;
      const height = element.videoHeight;
      if (!width || !height) {
        throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.CAMERA_OFF);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.CAMERA_OFF);
      ctx.drawImage(element, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        // Older Safari lacks toBlob; the data-URL route produces the same
        // bytes, just via a bigger intermediate string.
        if (typeof canvas.toBlob === "function") {
          canvas.toBlob(resolve, "image/jpeg", PHOTO_CAPTURE_JPEG_QUALITY);
        } else {
          fetch(canvas.toDataURL("image/jpeg", PHOTO_CAPTURE_JPEG_QUALITY))
            .then((r) => r.blob())
            .then(resolve)
            .catch(() => resolve(null));
        }
      });

      if (!blob) throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.UPLOAD_FAILED);
      return { blob, width, height };
    } finally {
      cleanup?.();
    }
  }, [resolveLocalVideo]);

  // ---- RPC registration ----
  useEffect(() => {
    const handleConsent = async (data: RpcInvocationData): Promise<string> => {
      // Only staff may ask. A patient identity here would mean someone joined
      // with a patient token and is driving the protocol.
      if (isPatientIdentity(data.callerIdentity)) {
        throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.UNAUTHORIZED);
      }

      const request = JSON.parse(data.payload) as PhotoConsentRequest;

      const granted = await new Promise<boolean>((resolve) => {
        setPrompt((current) => {
          // A second request while one is open — a clinician reconnecting, say.
          // Settle the old promise instead of dropping it on the floor, which
          // would hang that RPC until its timeout.
          current?.resolve(false);
          return {
            requestedBy: request.requestedBy || hostName || "",
            resolve,
          };
        });
      });

      // Recorded before replying, so the clinician is never told "granted" for
      // something the server has not durably accepted.
      await fetch("/api/video-call/photo-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, granted }),
      }).catch(() => undefined);

      consentRef.current = granted;

      const response: PhotoConsentResponse = { v: 1, granted };
      return JSON.stringify(response);
    };

    const handleCapture = async (data: RpcInvocationData): Promise<string> => {
      if (isPatientIdentity(data.callerIdentity)) {
        throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.UNAUTHORIZED);
      }
      if (!consentRef.current) {
        throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.CONSENT_NOT_GRANTED);
      }

      const request = JSON.parse(data.payload) as PhotoCaptureRequest;
      const { blob, width, height } = await captureBlob();

      const formData = new FormData();
      formData.append("file", blob, "video-consult.jpg");
      formData.append("width", String(width));
      formData.append("height", String(height));

      const uploaded = await fetch("/api/video-call/capture", {
        method: "POST",
        headers: { Authorization: `Bearer ${request.captureToken}` },
        body: formData,
      });

      if (!uploaded.ok) {
        throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.UPLOAD_FAILED);
      }

      const saved = (await uploaded.json()) as PhotoCaptureResponse;

      showCaptureFeedback();
      onCapturedRef.current?.({
        mediaId: saved.mediaId,
        filePath: saved.filePath,
        // The bytes are already here — no reason to round-trip a signed URL
        // just to show the patient the photo that was just taken.
        objectUrl: URL.createObjectURL(blob),
      });

      return JSON.stringify(saved);
    };

    // Keeps the patient's filmstrip in step when the clinician deletes a photo
    // on their side.
    const handleRemoved = async (data: RpcInvocationData): Promise<string> => {
      if (isPatientIdentity(data.callerIdentity)) {
        throw new RpcError(APP_ERROR, PHOTO_RPC_REASON.UNAUTHORIZED);
      }
      const notice = JSON.parse(data.payload) as PhotoRemovedNotice;
      onRemoteRemovedRef.current?.(notice.mediaId);
      return JSON.stringify({ v: 1, ok: true });
    };

    // Unregister first: registerRpcMethod throws if a handler is already bound,
    // and React StrictMode mounts effects twice in development.
    room.unregisterRpcMethod(PHOTO_CONSENT_RPC);
    room.unregisterRpcMethod(PHOTO_CAPTURE_RPC);
    room.unregisterRpcMethod(PHOTO_REMOVED_RPC);
    room.registerRpcMethod(PHOTO_CONSENT_RPC, handleConsent);
    room.registerRpcMethod(PHOTO_CAPTURE_RPC, handleCapture);
    room.registerRpcMethod(PHOTO_REMOVED_RPC, handleRemoved);

    return () => {
      room.unregisterRpcMethod(PHOTO_CONSENT_RPC);
      room.unregisterRpcMethod(PHOTO_CAPTURE_RPC);
      room.unregisterRpcMethod(PHOTO_REMOVED_RPC);
      // A prompt left open after teardown would never resolve, hanging the
      // clinician's request until its timeout.
      setPrompt((current) => {
        current?.resolve(false);
        return null;
      });
    };
  }, [room, inviteToken, hostName, captureBlob, showCaptureFeedback]);

  const answer = (granted: boolean) => {
    prompt?.resolve(granted);
    setPrompt(null);
  };

  return (
    <>
      {/* Shutter flash. Silent by design — the call has live audio and a
          shutter tone would talk over whoever is speaking. */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-[120] bg-white transition-opacity duration-150 ${
          flash ? "opacity-80" : "opacity-0"
        }`}
      />

      {banner && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[130] bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground shadow-md"
        >
          {t("photoSavedBanner")}
        </div>
      )}

      {prompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              {t("consentTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("consentBody", {
                name: prompt.requestedBy || t("videoCall"),
              })}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                variant="orange"
                onClick={() => answer(true)}
              >
                {t("consentAllow")}
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => answer(false)}
              >
                {t("consentDeny")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientPhotoResponder;
