// apps/web/components/patient-chart/videocall/CallStage.tsx
//
// The video area of a consult: remote participant full-bleed, local camera as a
// picture-in-picture inset.
//
// Deliberately mirrors the mobile CallStage (apps/mobile/.../video-call/
// components/CallStage.tsx), which already settled this layout — including the
// three fallbacks below, which are the states a consult actually spends time in.
//
// The PiP sits top-right rather than bottom-right on purpose: the bottom of this
// surface is reserved for the photo-capture overlays (PhotoCaptureButton at
// bottom-20, CapturedPhotoStrip at bottom-2), which mount here as `children`.
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  VideoTrack,
  useConnectionState,
  useRemoteParticipants,
  useTracks,
  type TrackReference,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { AgentAudioVisualizerBar } from "@/components/agents-ui/agent-audio-visualizer-bar";

/**
 * Every string rendered on the stage. The patient side passes translated
 * values — this surface is reached by patients in eight languages, so nothing
 * here may be hardcoded English at the point of use.
 */
export interface CallStageLabels {
  connecting: string;
  reconnecting: string;
  waiting: string;
  cameraOff: string;
  fitWhole: string;
  fillFrame: string;
}

const DEFAULT_LABELS: CallStageLabels = {
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  waiting: "Waiting for the other participant to join…",
  cameraOff: "Their camera is off",
  fitWhole: "Show the whole video",
  fillFrame: "Fill the frame",
};

/**
 * How the incoming video is mapped onto this (always 16:9) stage.
 *
 * `contain` letterboxes — every pixel the far end sent is visible, at the cost
 * of black bars. `cover` fills the stage and crops whatever doesn't fit.
 */
type VideoFit = "contain" | "cover";

/**
 * The sensible default for a given source, which is entirely about whether the
 * far end is holding a phone.
 *
 * A clinician on a phone publishes portrait (9:16); cropping that to 16:9 cuts
 * away their head and everything below the chest, so it has to letterbox. A
 * laptop webcam publishes 16:9 or 4:3, both of which fill this stage with
 * little or no loss, and filling looks materially better than bars on three
 * sides. Undefined dimensions (nothing published yet) default to `cover` —
 * the same thing the stage did before it could tell the difference.
 */
const autoFitFor = (dimensions?: { width: number; height: number }): VideoFit =>
  dimensions && dimensions.height > dimensions.width ? "contain" : "cover";

interface CallStageProps {
  labels?: Partial<CallStageLabels>;
  children?: React.ReactNode;
}

export const CallStage: React.FC<CallStageProps> = ({ labels, children }) => {
  const t = { ...DEFAULT_LABELS, ...labels };
  const connectionState = useConnectionState();
  const remotes = useRemoteParticipants();

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.Microphone, withPlaceholder: false },
  ]);

  const { localCamera, remoteCamera, remoteMic } = useMemo(
    () => ({
      localCamera: tracks.find(
        (track) => track.participant.isLocal && track.source === Track.Source.Camera,
      ),
      remoteCamera: tracks.find(
        (track) => !track.participant.isLocal && track.source === Track.Source.Camera,
      ),
      remoteMic: tracks.find(
        (track) =>
          !track.participant.isLocal && track.source === Track.Source.Microphone,
      ),
    }),
    [tracks],
  );

  // withPlaceholder yields a reference with no publication for a participant who
  // has not published a camera at all, so presence of the reference is not
  // enough — a muted publication is the common case when someone taps away.
  const remoteCameraLive = Boolean(
    remoteCamera?.publication && !remoteCamera.publication.isMuted,
  );
  const connecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;

  // Dimensions are read off the publication during render rather than
  // subscribed to: useTracks already re-renders this component on every room
  // event that could change what is published. A mid-call device rotation is
  // the one case that may not re-derive on its own — which is the other half of
  // why the toggle exists, rather than auto-detection alone.
  const remoteDimensions = remoteCamera?.publication?.dimensions;
  const autoFit = autoFitFor(remoteDimensions);

  // null means "follow autoFit". A user choice sticks for as long as the same
  // camera track is on screen, and is dropped when the track is replaced (the
  // other side rejoined, or switched device) — at which point the auto rule is
  // the better guess again.
  const [fitOverride, setFitOverride] = useState<VideoFit | null>(null);
  const remoteTrackSid = remoteCamera?.publication?.trackSid;
  useEffect(() => {
    setFitOverride(null);
  }, [remoteTrackSid]);

  const fit = fitOverride ?? autoFit;

  return (
    // aspect-video sizes the stage from its width, which on a wide desktop
    // would push it past the fold on the patient's full-page view — hence the
    // viewport cap. The stage is 16:9 regardless of what the far end sends, so
    // the remote video letterboxes into it (see object-contain below).
    <div className="relative aspect-video max-h-[70vh] w-full overflow-hidden rounded-lg bg-black">
      {connecting ? (
        <Centered>
          <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          <p className="text-sm text-white/70">
            {connectionState === ConnectionState.Reconnecting
              ? t.reconnecting
              : t.connecting}
          </p>
        </Centered>
      ) : remotes.length === 0 ? (
        <Centered>
          <p className="text-sm text-white/70">{t.waiting}</p>
        </Centered>
      ) : remoteCameraLive ? (
        <VideoTrack
          trackRef={remoteCamera as TrackReference}
          className={`h-full w-full ${
            fit === "contain" ? "object-contain" : "object-cover"
          }`}
        />
      ) : (
        // Camera off is not the same as absent. A visualiser on their mic keeps
        // the other person present on screen while they are still talking —
        // a static avatar reads as a dropped call.
        <Centered>
          <AgentAudioVisualizerBar
            size="lg"
            barCount={5}
            audioTrack={remoteMic}
            state="speaking"
            className="text-white"
          />
          <p className="text-sm text-white/70">{t.cameraOff}</p>
        </Centered>
      )}

      {/* Fit toggle. Top-LEFT: the PiP owns top-right and the photo-capture
          overlays own the bottom, so this is the only corner that is free on
          both the clinician's and the patient's build of this stage. Only
          offered when there is actually a remote frame to reshape. */}
      {remoteCameraLive && !connecting && (
        <button
          type="button"
          onClick={() =>
            setFitOverride(fit === "contain" ? "cover" : "contain")
          }
          aria-label={fit === "contain" ? t.fillFrame : t.fitWhole}
          title={fit === "contain" ? t.fillFrame : t.fitWhole}
          className="absolute left-3 top-3 z-20 rounded-md bg-black/50 p-2 text-white/80 transition hover:bg-black/70 hover:text-white"
        >
          {fit === "contain" ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </button>
      )}

      {localCamera?.publication && !localCamera.publication.isMuted && (
        <VideoTrack
          trackRef={localCamera as TrackReference}
          className="absolute right-3 top-3 z-20 h-32 w-24 rounded-md border border-white/30 object-cover shadow-lg"
        />
      )}

      {children}
    </div>
  );
};

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
    {children}
  </div>
);

export default CallStage;
