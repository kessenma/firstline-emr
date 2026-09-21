// apps/web/components/patient-chart/videocall/PhotoCaptureButton.tsx
//
// The clinician's shutter, overlaid on the call surface.
//
// Two-stage by design: the first press asks the patient for permission, and
// only once they agree does the button become a shutter that fires without
// further prompting. The visual state carries that distinction — an outlined
// camera means "this will ask", a filled one means "this will take a photo".
"use client";

import React from "react";
import {
  useConnectionState,
  useRemoteParticipants,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { isPatientIdentity } from "@fajr/shared/video-call";
import type { PhotoCaptureController } from "./usePhotoCapture";

interface PhotoCaptureButtonProps {
  controller: PhotoCaptureController;
}

const PhotoCaptureButton: React.FC<PhotoCaptureButtonProps> = ({
  controller,
}) => {
  const { status, error, requestConsent, capture, dismissError } = controller;
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();

  const patient = remoteParticipants.find((participant) =>
    isPatientIdentity(participant.identity),
  );
  const cameraPublication = patient?.getTrackPublication(Track.Source.Camera);

  // Checked before the press rather than after. The dominant failure — the
  // patient's browser suspended in the background — shows up here as a muted
  // publication, so the button can grey out instead of failing 30s later.
  const cameraLive = Boolean(
    cameraPublication && !cameraPublication.isMuted,
  );

  const busy = status === "requesting" || status === "capturing";
  const disabled =
    busy ||
    connectionState !== ConnectionState.Connected ||
    !patient ||
    !cameraLive;

  const label = (() => {
    if (!patient) return "Waiting for the patient to join";
    if (!cameraLive) return "The patient's camera is off";
    switch (status) {
      case "requesting":
        return "Waiting for the patient to answer…";
      case "capturing":
        return "Saving photo…";
      case "denied":
        return "Photos declined — ask again";
      case "armed":
        return "Take a photo for the chart";
      default:
        return "Ask to take photos";
    }
  })();

  const onClick = () => {
    if (status === "armed") void capture();
    else void requestConsent();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 flex flex-col items-center gap-2">
      {error && (
        <div
          role="alert"
          className="pointer-events-auto flex items-center gap-3 rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground shadow-lg"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={dismissError}
            className="font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={[
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition",
          "disabled:cursor-not-allowed disabled:opacity-40",
          status === "armed" || status === "capturing"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-2 border-white/80 bg-black/50 text-white hover:bg-black/70",
        ].join(" ")}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : status === "denied" ? (
          <CameraOff className="h-6 w-6" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
      </button>

      <span className="pointer-events-none rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </span>
    </div>
  );
};

export default PhotoCaptureButton;
