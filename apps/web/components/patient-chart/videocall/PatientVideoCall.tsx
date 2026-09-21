// apps/web/components/patient-chart/videocall/PatientVideoCall.tsx
//
// The patient's side of a consult. Reached at /call?invite=<token>, which is
// the only credential — there is no login. The old flow took ?room= and ?user=
// straight off the query string and minted a token for whatever it was given.
//
// Every string here renders in the patient's recorded language. That language
// arrives twice on purpose: `?lang=` on the invite link covers the connecting
// and error screens, which render before this page has joined anything, and
// the join response overrides it once the server has spoken.
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DisconnectReason, VideoPresets } from "livekit-client";
import VideoCallInterface from "./VideoCallInterface";
import PatientHostPresence from "./PatientHostPresence";
import PatientPhotoResponder from "./PatientPhotoResponder";
import PatientTranscriptionConsent from "./PatientTranscriptionConsent";
import PatientPhotoStrip from "./PatientPhotoStrip";
import { Button } from "@/components/ui/button";
import { getVideoCallTranslation } from "./video-call-patient-translations";
import {
  isRtlLanguage,
  normalizeLanguage,
} from "@fajr/shared/constants/languages";
import type { CapturedPhoto, JoinCallResponse } from "@fajr/shared/video-call";

/** Translation keys this page can put in `error`. */
type ErrorKey = "linkInvalid" | "linkExpired" | "connectionFailed";

/**
 * Capture at 1080p, publish at 720p.
 *
 * Stills for the chart are drawn from the local camera track, so their
 * resolution is whatever the camera is producing — not what the clinician
 * receives, and nothing to do with how large the video is displayed on either
 * end. Raising only the capture side gives materially better clinical images
 * for a small CPU cost on the patient's device.
 *
 * `publishDefaults.videoEncoding` is pinned deliberately: without it LiveKit
 * derives the encoding from the capture dimensions and the patient's uplink
 * bitrate would climb with the capture resolution. The call itself must be
 * unaffected — a sharper photo is not worth a worse consult.
 *
 * Module-scope so the object identity is stable; a fresh object each render
 * would be a new `options` prop on LiveKitRoom.
 */
const ROOM_OPTIONS = {
  videoCaptureDefaults: { resolution: VideoPresets.h1080.resolution },
  publishDefaults: { videoEncoding: VideoPresets.h720.encoding },
} as const;

const PatientVideoCall: React.FC = () => {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const langParam = searchParams.get("lang");

  const [call, setCall] = useState<JoinCallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [ended, setEnded] = useState(false);
  // Whether the consult ended because the clinician's side went away, as
  // opposed to the patient closing it themselves or the connection failing.
  // Only affects what the end screen says — but "your doctor ended the call" is
  // the difference between a finished appointment and an apparent malfunction.
  const [endedByHost, setEndedByHost] = useState(false);

  // Fired by the grace-period watchdog just before it disconnects; see
  // PatientHostPresence. Stable identity — it is a hook dependency there.
  const handleHostAbsent = useCallback(() => setEndedByHost(true), []);

  const handleDisconnected = useCallback((reason?: DisconnectReason) => {
    // ROOM_DELETED is the clinician hanging up: /api/video-call/end closes the
    // room on the SFU, which drops the patient with this reason.
    // PARTICIPANT_REMOVED covers a staff member removing them by hand.
    if (
      reason === DisconnectReason.ROOM_DELETED ||
      reason === DisconnectReason.PARTICIPANT_REMOVED
    ) {
      setEndedByHost(true);
    }
    setEnded(true);
  }, []);
  // null = the patient has not answered the transcription prompt yet. The call
  // is not joined until they have, which is the whole point of a pre-join gate:
  // consent asked after the audio starts flowing is not consent.
  const [transcriptionConsent, setTranscriptionConsent] = useState<
    boolean | null
  >(null);

  // The join response wins once it lands; until then the link's ?lang= is the
  // best guess available. Both go through normalizeLanguage — the underlying
  // column is free text and the query param is trivially editable.
  const language = useMemo(
    () => normalizeLanguage(call?.language ?? langParam),
    [call?.language, langParam],
  );
  const isRtl = isRtlLanguage(language);

  const t = useCallback(
    (
      key: Parameters<typeof getVideoCallTranslation>[0],
      vars?: Record<string, string>,
    ) => getVideoCallTranslation(key, language, vars),
    [language],
  );

  const join = useCallback(async () => {
    if (!inviteToken) {
      setError("linkInvalid");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/video-call/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      });

      if (response.status === 410) {
        setError("linkExpired");
        return;
      }

      if (!response.ok) {
        setError("linkInvalid");
        return;
      }

      setCall((await response.json()) as JoinCallResponse);
    } catch {
      setError("connectionFailed");
    } finally {
      setLoading(false);
    }
  }, [inviteToken]);

  useEffect(() => {
    void join();
  }, [join]);

  // Records the answer server-side before joining. That row is the durable
  // evidence; the data-channel message published once in-room is only how the
  // clinician's phone learns to act on it.
  const answerTranscription = useCallback(
    async (granted: boolean) => {
      setTranscriptionConsent(granted);
      if (!inviteToken) return;
      try {
        await fetch("/api/video-call/transcription-consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviteToken,
            decision: granted ? "granted" : "declined",
            locale: language,
          }),
        });
      } catch {
        // Non-fatal. The clinician's device fails closed without a granted
        // message, so a lost request means no transcription — never the reverse.
      }
    },
    [inviteToken, language],
  );

  // Photos captured on this call, shown back to the patient.
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  // Repopulates after a reload — the in-memory list from the responder does not
  // survive one, but the call and its photos do.
  useEffect(() => {
    if (!call || !inviteToken) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/video-call/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          photos: { mediaId: string; url: string; capturedAt: string }[];
        };
        if (cancelled) return;
        setPhotos(
          data.photos.map((photo) => ({ ...photo, filePath: "" })),
        );
      } catch {
        // Non-fatal: the strip stays empty and fills as new photos are taken.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, inviteToken]);

  const handleCaptured = useCallback(
    (photo: { mediaId: string; filePath: string; objectUrl: string }) => {
      setPhotos((prev) => [
        {
          mediaId: photo.mediaId,
          filePath: photo.filePath,
          url: photo.objectUrl,
          capturedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const handleRemoved = useCallback((mediaId: string) => {
    setPhotos((prev) => {
      // Only object URLs need revoking; signed URLs from the server do not.
      // Deferred rather than done inline: a state updater must stay pure, and
      // StrictMode calls it twice.
      const gone = prev.find((photo) => photo.mediaId === mediaId);
      if (gone?.url.startsWith("blob:")) {
        queueMicrotask(() => URL.revokeObjectURL(gone.url));
      }
      return prev.filter((photo) => photo.mediaId !== mediaId);
    });
  }, []);

  // Applied per branch rather than once at a shared root, since each branch
  // returns early.
  const dir = isRtl ? "rtl" : "ltr";

  if (loading) {
    return (
      <div
        dir={dir}
        className="flex h-screen items-center justify-center text-muted-foreground"
      >
        {t("connecting")}
      </div>
    );
  }

  if (ended) {
    return (
      <div
        dir={dir}
        className="flex h-screen flex-col items-center justify-center px-4 text-center"
      >
        <p className="text-lg font-medium text-foreground">
          {endedByHost ? t("callEndedByDoctor") : t("callEnded")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("closeWindow")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        dir={dir}
        className="flex h-screen flex-col items-center justify-center px-4 text-center text-destructive"
      >
        <p>{t(error)}</p>
        <Button className="mt-4" onClick={() => void join()}>
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  // Pre-join gate. Only shown when the clinician actually has transcription
  // enabled and the patient has not already answered on this call — a patient
  // who reloads mid-call is not asked twice.
  const needsTranscriptionAnswer =
    !!call &&
    call.transcriptionOffered &&
    transcriptionConsent === null &&
    !call.transcriptionConsent;

  if (needsTranscriptionAnswer) {
    return (
      <div
        dir={dir}
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-10"
      >
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">
            {t("transcriptionTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("transcriptionBody")}
          </p>

          {/* Declining is a full-width, equally prominent button, not a grey
              link. A refusal that is harder to click than an acceptance is not
              a real choice. */}
          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => void answerTranscription(true)}
            >
              {t("transcriptionAllow")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void answerTranscription(false)}
            >
              {t("transcriptionJoinWithout")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="flex min-h-screen flex-col bg-background">
      {/* Shows the clinician's name, never the room name — that now contains
          the patient id. */}
      <h1 className="p-4 text-center text-xl font-bold text-primary">
        {call?.hostName
          ? t("callWithDoctor", { name: call.hostName })
          : t("videoCall")}
      </h1>
      {call && (
        <VideoCallInterface
          token={call.token}
          serverUrl={call.serverUrl}
          onDisconnected={handleDisconnected}
          className="flex-1 px-4 pb-4"
          options={ROOM_OPTIONS}
          stageLabels={{
            connecting: t("connecting"),
            reconnecting: t("reconnecting"),
            waiting: t("waitingForDoctor"),
            cameraOff: t("cameraOffNotice"),
            fitWhole: t("fitWholeVideo"),
            fillFrame: t("fillFrame"),
          }}
          controlLabels={{
            muteMic: t("muteMic"),
            unmuteMic: t("unmuteMic"),
            turnCameraOff: t("turnCameraOff"),
            turnCameraOn: t("turnCameraOn"),
            endCall: t("endCall"),
          }}
        >
          <PatientHostPresence
            labels={{ hostLeftWaiting: t("doctorLeftWaiting") }}
            onHostAbsent={handleHostAbsent}
          />
          {call.transcriptionOffered && (
            <PatientTranscriptionConsent
              inviteToken={inviteToken!}
              language={language}
              granted={
                transcriptionConsent ?? call.transcriptionConsent === "granted"
              }
            />
          )}
          <PatientPhotoResponder
            inviteToken={inviteToken!}
            hostName={call.hostName}
            language={language}
            initialConsent={call.photoConsentGranted}
            onCaptured={handleCaptured}
            onRemoteRemoved={handleRemoved}
          />
        </VideoCallInterface>
      )}

      {call && (
        <PatientPhotoStrip
          inviteToken={inviteToken!}
          language={language}
          photos={photos}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  );
};

export default PatientVideoCall;
