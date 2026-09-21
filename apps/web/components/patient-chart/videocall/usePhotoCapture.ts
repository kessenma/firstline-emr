// apps/web/components/patient-chart/videocall/usePhotoCapture.ts
//
// Clinician side of photo capture. Owns the consent handshake, the capture
// request, and the list of what has been taken this call.
//
// Nothing here touches pixels. The clinician's client asks the patient's
// browser to photograph itself over RPC and receives an id back — see
// packages/shared/src/video-call/photo-capture.ts for why.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  PHOTO_CAPTURE_RPC,
  PHOTO_CAPTURE_TIMEOUT_MS,
  PHOTO_CONSENT_RPC,
  PHOTO_CONSENT_TIMEOUT_MS,
  PHOTO_REMOVED_RPC,
  buildPatientIdentity,
  photoCaptureFailureFrom,
  PHOTO_CAPTURE_FAILURE_MESSAGE,
} from "@fajr/shared/video-call";
import type {
  CapturedPhoto,
  PhotoCaptureRequest,
  PhotoCaptureResponse,
  PhotoCaptureStatus,
  PhotoConsentRequest,
  PhotoConsentResponse,
  PhotoRemovedNotice,
} from "@fajr/shared/video-call";
import { getMediaUrl, invalidateMediaUrl } from "@/lib/media";

interface UsePhotoCaptureParams {
  sessionId: string | undefined;
  patientId: string;
  /** Name shown to the patient in the consent prompt. */
  requestedBy: string;
  /** Called after a successful capture so the chart gallery can update. */
  onCaptured?: (photo: { mediaId: string; filePath: string }) => void;
  onRemoved?: (mediaId: string) => void;
}

export interface PhotoCaptureController {
  status: PhotoCaptureStatus;
  photos: CapturedPhoto[];
  error: string | null;
  requestConsent: () => Promise<void>;
  capture: () => Promise<void>;
  remove: (mediaId: string) => Promise<void>;
  dismissError: () => void;
}

export function usePhotoCapture({
  sessionId,
  patientId,
  requestedBy,
  onCaptured,
  onRemoved,
}: UsePhotoCaptureParams): PhotoCaptureController {
  const room = useRoomContext();

  const [status, setStatus] = useState<PhotoCaptureStatus>("unconsented");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onCapturedRef = useRef(onCaptured);
  const onRemovedRef = useRef(onRemoved);
  useEffect(() => {
    onCapturedRef.current = onCaptured;
  }, [onCaptured]);
  useEffect(() => {
    onRemovedRef.current = onRemoved;
  }, [onRemoved]);

  const patientIdentity = buildPatientIdentity(patientId);

  /**
   * Re-read consent from the server.
   *
   * The RPC response is only a notification — the database is what decides. If
   * the reply is lost to a timeout or a reconnect after the patient already
   * tapped Allow, this is what stops the clinician being stuck asking forever.
   */
  const reconcileConsent = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `/api/video-call/${sessionId}/photo-consent`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        granted: boolean;
        deniedAt: string | null;
      };
      setStatus(data.granted ? "armed" : data.deniedAt ? "denied" : "unconsented");
    } catch {
      // Leave the current status alone — this is a best-effort correction.
    }
  }, [sessionId]);

  useEffect(() => {
    void reconcileConsent();
  }, [reconcileConsent]);

  const requestConsent = useCallback(async () => {
    if (!sessionId) return;

    setStatus("requesting");
    setError(null);

    const payload: PhotoConsentRequest = { v: 1, requestedBy };

    try {
      const raw = await room.localParticipant.performRpc({
        destinationIdentity: patientIdentity,
        method: PHOTO_CONSENT_RPC,
        payload: JSON.stringify(payload),
        responseTimeout: PHOTO_CONSENT_TIMEOUT_MS,
      });

      const response = JSON.parse(raw) as PhotoConsentResponse;
      setStatus(response.granted ? "armed" : "denied");
    } catch (err) {
      const failure = photoCaptureFailureFrom(err);
      setError(PHOTO_CAPTURE_FAILURE_MESSAGE[failure]);
      // The patient may have answered even though the reply never arrived.
      await reconcileConsent();
      setStatus((current) => (current === "requesting" ? "unconsented" : current));
    }
  }, [room, sessionId, patientIdentity, requestedBy, reconcileConsent]);

  const capture = useCallback(async () => {
    if (!sessionId) return;

    setStatus("capturing");
    setError(null);

    try {
      // Fresh token per capture: 90 seconds, one session, minted only for an
      // authenticated clinician.
      const tokenResponse = await fetch(
        `/api/video-call/${sessionId}/capture-token`,
        { method: "POST" },
      );

      if (!tokenResponse.ok) {
        // 403 means consent was withdrawn or never landed — re-read rather
        // than leaving the button armed against a server that will refuse.
        if (tokenResponse.status === 403) await reconcileConsent();
        throw new Error("capture-token");
      }

      const { captureToken } = (await tokenResponse.json()) as {
        captureToken: string;
      };

      const payload: PhotoCaptureRequest = { v: 1, captureToken };
      const raw = await room.localParticipant.performRpc({
        destinationIdentity: patientIdentity,
        method: PHOTO_CAPTURE_RPC,
        payload: JSON.stringify(payload),
        responseTimeout: PHOTO_CAPTURE_TIMEOUT_MS,
      });

      const saved = JSON.parse(raw) as PhotoCaptureResponse;

      // The clinician is authenticated, so the ordinary signed-URL path works.
      const url = (await getMediaUrl(saved.filePath)) ?? "";

      setPhotos((prev) => [
        ...prev,
        {
          mediaId: saved.mediaId,
          filePath: saved.filePath,
          url,
          capturedAt: new Date().toISOString(),
        },
      ]);
      onCapturedRef.current?.({
        mediaId: saved.mediaId,
        filePath: saved.filePath,
      });
      setStatus("armed");
    } catch (err) {
      const failure =
        err instanceof Error && err.message === "capture-token"
          ? "unknown"
          : photoCaptureFailureFrom(err);
      setError(PHOTO_CAPTURE_FAILURE_MESSAGE[failure]);
      setStatus((current) => (current === "capturing" ? "armed" : current));
    }
  }, [room, sessionId, patientIdentity, reconcileConsent]);

  const remove = useCallback(
    async (mediaId: string) => {
      const target = photos.find((photo) => photo.mediaId === mediaId);

      try {
        const response = await fetch(
          `/api/patient/${patientId}/media/${mediaId}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("delete-failed");

        if (target) invalidateMediaUrl(target.filePath);
        setPhotos((prev) => prev.filter((photo) => photo.mediaId !== mediaId));
        onRemovedRef.current?.(mediaId);

        // Best-effort: keep the patient's filmstrip in step. If this fails the
        // two views diverge until a reload, which is cosmetic — the row is
        // already gone.
        const notice: PhotoRemovedNotice = { v: 1, mediaId };
        void room.localParticipant
          .performRpc({
            destinationIdentity: patientIdentity,
            method: PHOTO_REMOVED_RPC,
            payload: JSON.stringify(notice),
          })
          .catch(() => undefined);
      } catch {
        setError("Could not delete the photo. Please try again.");
      }
    },
    [photos, patientId, room, patientIdentity],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { status, photos, error, requestConsent, capture, remove, dismissError };
}
