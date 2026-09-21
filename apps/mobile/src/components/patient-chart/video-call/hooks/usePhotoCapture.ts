// apps/mobile/src/components/patient-chart/video-call/hooks/usePhotoCapture.ts
//
// Clinician side of photo capture on mobile. Same protocol as web — see
// packages/shared/src/video-call/photo-capture.ts.
//
// This hook takes no photographs. React Native's WebRTC layer exposes no way to
// read pixels out of a video track, so the clinician's device asks the
// patient's browser to photograph itself and gets back an id. That is why this
// file is a network client and not a camera.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import {
  PHOTO_CAPTURE_FAILURE_MESSAGE,
  PHOTO_CAPTURE_RPC,
  PHOTO_CAPTURE_TIMEOUT_MS,
  PHOTO_CONSENT_RPC,
  PHOTO_CONSENT_TIMEOUT_MS,
  PHOTO_REMOVED_RPC,
  buildPatientIdentity,
  photoCaptureFailureFrom,
} from '@fajr/shared/video-call';
import type {
  CapturedPhoto,
  PhotoCaptureRequest,
  PhotoCaptureResponse,
  PhotoCaptureStatus,
  PhotoConsentRequest,
  PhotoConsentResponse,
  PhotoRemovedNotice,
} from '@fajr/shared/video-call';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { getPatientPhotoSignedUrl } from '../../../../services/PatientMediaService';

export interface PhotoCaptureController {
  status: PhotoCaptureStatus;
  photos: CapturedPhoto[];
  error: string | null;
  requestConsent: () => Promise<void>;
  capture: () => Promise<void>;
  remove: (mediaId: string) => Promise<void>;
  clearError: () => void;
}

interface UsePhotoCaptureParams {
  room: Room;
  patientId: string;
  /** video_call_sessions.id for the live call, if any. */
  sessionId: string | null;
  onPhotosChanged?: (change:
    | { type: 'added'; mediaId: string; filePath: string }
    | { type: 'removed'; mediaId: string }) => void;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  return { Authorization: `Bearer ${token}` };
}

export function usePhotoCapture({
  room,
  patientId,
  sessionId,
  onPhotosChanged,
}: UsePhotoCaptureParams): PhotoCaptureController {
  const [status, setStatus] = useState<PhotoCaptureStatus>('unconsented');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onPhotosChangedRef = useRef(onPhotosChanged);
  useEffect(() => {
    onPhotosChangedRef.current = onPhotosChanged;
  }, [onPhotosChanged]);

  const patientIdentity = buildPatientIdentity(patientId);

  // A new call is a new consent. Reset so a second consult never starts armed
  // off the back of the first.
  useEffect(() => {
    setStatus('unconsented');
    setPhotos([]);
    setError(null);
  }, [sessionId]);

  /**
   * Re-read consent from the server. The RPC reply is only a notification —
   * the database decides. Without this, a lost reply would leave the clinician
   * asking a patient who already agreed.
   */
  const reconcileConsent = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        getApiUrl(`/video-call/${sessionId}/photo-consent`),
        { headers: await authHeaders() },
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        granted: boolean;
        deniedAt: string | null;
      };
      setStatus(
        data.granted ? 'armed' : data.deniedAt ? 'denied' : 'unconsented',
      );
    } catch {
      // Best-effort correction; leave the current status alone.
    }
  }, [sessionId]);

  const requestConsent = useCallback(async () => {
    if (!sessionId) return;

    setStatus('requesting');
    setError(null);

    const payload: PhotoConsentRequest = { v: 1, requestedBy: '' };

    try {
      const raw = await room.localParticipant.performRpc({
        destinationIdentity: patientIdentity,
        method: PHOTO_CONSENT_RPC,
        payload: JSON.stringify(payload),
        responseTimeout: PHOTO_CONSENT_TIMEOUT_MS,
      });

      const response = JSON.parse(raw) as PhotoConsentResponse;
      setStatus(response.granted ? 'armed' : 'denied');
    } catch (err) {
      setError(PHOTO_CAPTURE_FAILURE_MESSAGE[photoCaptureFailureFrom(err)]);
      await reconcileConsent();
      setStatus(current => (current === 'requesting' ? 'unconsented' : current));
    }
  }, [room, sessionId, patientIdentity, reconcileConsent]);

  const capture = useCallback(async () => {
    if (!sessionId) return;

    setStatus('capturing');
    setError(null);

    try {
      const tokenResponse = await fetch(
        getApiUrl(`/video-call/${sessionId}/capture-token`),
        { method: 'POST', headers: await authHeaders() },
      );

      if (!tokenResponse.ok) {
        // 403 means consent was withdrawn or never landed.
        if (tokenResponse.status === 403) await reconcileConsent();
        throw new Error('capture-token');
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
      const url =
        (await getPatientPhotoSignedUrl(patientId, saved.filePath)) ?? '';

      setPhotos(prev => [
        ...prev,
        {
          mediaId: saved.mediaId,
          filePath: saved.filePath,
          url,
          capturedAt: new Date().toISOString(),
        },
      ]);
      onPhotosChangedRef.current?.({
        type: 'added',
        mediaId: saved.mediaId,
        filePath: saved.filePath,
      });
      setStatus('armed');
    } catch (err) {
      const failure =
        err instanceof Error && err.message === 'capture-token'
          ? 'unknown'
          : photoCaptureFailureFrom(err);
      setError(PHOTO_CAPTURE_FAILURE_MESSAGE[failure]);
      setStatus(current => (current === 'capturing' ? 'armed' : current));
    }
  }, [room, sessionId, patientId, patientIdentity, reconcileConsent]);

  const remove = useCallback(
    async (mediaId: string) => {
      try {
        const response = await fetch(
          getApiUrl(`/patient/${patientId}/media/${mediaId}`),
          { method: 'DELETE', headers: await authHeaders() },
        );
        if (!response.ok) throw new Error('delete-failed');

        setPhotos(prev => prev.filter(photo => photo.mediaId !== mediaId));
        onPhotosChangedRef.current?.({ type: 'removed', mediaId });

        // Best-effort: keep the patient's filmstrip in step. A failure here
        // only diverges the two views until reload — the row is already gone.
        const notice: PhotoRemovedNotice = { v: 1, mediaId };
        void room.localParticipant
          .performRpc({
            destinationIdentity: patientIdentity,
            method: PHOTO_REMOVED_RPC,
            payload: JSON.stringify(notice),
          })
          .catch(() => undefined);
      } catch {
        setError('Could not delete the photo. Please try again.');
      }
    },
    [patientId, room, patientIdentity],
  );

  const clearError = useCallback(() => setError(null), []);

  return { status, photos, error, requestConsent, capture, remove, clearError };
}
