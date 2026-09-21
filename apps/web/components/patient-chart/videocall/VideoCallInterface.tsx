// apps/web/components/patient-chart/videocall/VideoCallInterface.tsx
"use client";

import React from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import type { RoomOptions } from "livekit-client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CallStage, type CallStageLabels } from "./CallStage";
import { CallControls, type CallControlLabels } from "./CallControls";

interface VideoCallInterfaceProps {
  token: string;
  /**
   * SFU websocket URL. Supplied by the API response rather than read from
   * NEXT_PUBLIC_LIVEKIT_URL so the client always connects to the server that
   * actually issued the token.
   */
  serverUrl: string;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  /**
   * Room construction options. The patient side uses this to capture at a
   * higher resolution than it publishes — see PatientVideoCall.
   */
  options?: RoomOptions;
  /**
   * Rendered inside the room, so children can use the LiveKit context hooks
   * (useRoomContext, useRemoteParticipants). This is where the photo-capture
   * UI mounts on the clinician side and the RPC responder on the patient side.
   *
   * Mounted inside the stage, which is the positioning parent those overlays
   * expect: PhotoCaptureButton and CapturedPhotoStrip anchor themselves to the
   * bottom of the video area, not to the bottom of the controls.
   */
  children?: React.ReactNode;
  /** Called by the in-surface hang-up button. Omit to hide it. */
  onEndCall?: () => void;
  /** Translated strings for the patient side; English defaults otherwise. */
  stageLabels?: Partial<CallStageLabels>;
  controlLabels?: Partial<CallControlLabels>;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  token,
  serverUrl,
  onDisconnected,
  onError,
  className,
  options,
  children,
  onEndCall,
  stageLabels,
  controlLabels,
}) => {
  if (!token || !serverUrl) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Connecting…
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video
      audio
      options={options}
      onDisconnected={onDisconnected}
      onError={onError}
      className={cn("flex flex-col", className)}
    >
      {/* VideoConference used to supply this implicitly. It is what renders the
          <audio> elements for remote tracks — without it the call connects and
          is simply silent. */}
      <RoomAudioRenderer />

      {/* Browser autoplay policy blocks remote audio until a user gesture.
          StartAudio renders itself only when playback is actually blocked. */}
      <StartAudio
        label="Click to enable audio"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mb-2 self-center",
        )}
      />

      <CallStage labels={stageLabels}>{children}</CallStage>
      <CallControls onEndCall={onEndCall} labels={controlLabels} />
    </LiveKitRoom>
  );
};

export default VideoCallInterface;
