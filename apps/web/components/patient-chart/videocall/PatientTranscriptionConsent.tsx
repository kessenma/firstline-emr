// apps/web/components/patient-chart/videocall/PatientTranscriptionConsent.tsx
//
// Publishes the patient's transcription decision to the clinician's device, and
// gives them a way to withdraw it mid-call.
//
// Rendered inside LiveKitRoom so it can use the room's data channel. The
// decision is already recorded server-side by the time this mounts — that row
// is the evidence. This exists because the clinician's phone has to *act* on
// the answer in real time, and it re-announces on participant-joined so a
// clinician who reconnects still learns it.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { FileText, X } from "lucide-react";
import { getVideoCallTranslation } from "./video-call-patient-translations";

interface PatientTranscriptionConsentProps {
  inviteToken: string;
  language: string;
  /** What the patient chose on the pre-join screen. */
  granted: boolean;
}

const encoder = new TextEncoder();

export const PatientTranscriptionConsent: React.FC<
  PatientTranscriptionConsentProps
> = ({ inviteToken, language, granted }) => {
  const room = useRoomContext();
  const [active, setActive] = useState(granted);
  const [justStopped, setJustStopped] = useState(false);

  const t = useCallback(
    (key: Parameters<typeof getVideoCallTranslation>[0]) =>
      getVideoCallTranslation(key, language),
    [language],
  );

  const publish = useCallback(
    async (decision: "granted" | "declined") => {
      try {
        await room.localParticipant.publishData(
          encoder.encode(
            JSON.stringify({
              t: "consent",
              v: 1,
              transcription: decision,
              at: new Date().toISOString(),
            }),
          ),
          { reliable: true },
        );
      } catch {
        // The clinician's device fails closed on a missing message, so a failed
        // publish degrades to "no transcription" rather than transcribing
        // without consent.
      }
    },
    [room],
  );

  // Announce on mount, and again whenever someone joins — a clinician who
  // reconnects mid-call missed everything published before they arrived.
  useEffect(() => {
    const decision = active ? "granted" : "declined";
    void publish(decision);

    const handleParticipantConnected = () => {
      void publish(active ? "granted" : "declined");
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room, active, publish]);

  const handleStop = useCallback(async () => {
    setActive(false);
    setJustStopped(true);
    await publish("declined");

    // Record the withdrawal server-side too. 'withdrawn' is kept distinct from
    // 'declined' because what happens to already-captured audio differs.
    try {
      await fetch("/api/video-call/transcription-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken,
          decision: "withdrawn",
          locale: language,
        }),
      });
    } catch {
      // The data-channel message is what actually stops the recording; this
      // request only updates the audit record.
    }
  }, [inviteToken, language, publish]);

  if (justStopped && !active) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
        <X className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("transcriptionStopped")}
        </span>
      </div>
    );
  }

  if (!active) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 dark:bg-amber-950">
      <FileText className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
      <span className="flex-1 text-sm text-amber-900 dark:text-amber-200">
        {t("transcriptionActiveBanner")}
      </span>
      <button
        type="button"
        onClick={() => void handleStop()}
        className="shrink-0 rounded border border-amber-700 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200 dark:border-amber-400 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        {t("transcriptionStop")}
      </button>
    </div>
  );
};

export default PatientTranscriptionConsent;
