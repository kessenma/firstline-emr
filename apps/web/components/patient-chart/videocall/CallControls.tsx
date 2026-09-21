// apps/web/components/patient-chart/videocall/CallControls.tsx
//
// Mic / camera / hang-up for a consult.
//
// Rendered below the stage rather than overlaid on it, because the bottom of the
// stage is reserved for the photo-capture overlays. AgentDisconnectButton is
// deliberately not used: it resolves the room through useSessionContext(), which
// only exists under an agent session provider — there is no agent in a consult.
"use client";

import React, { useMemo } from "react";
import {
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentAudioVisualizerBar } from "@/components/agents-ui/agent-audio-visualizer-bar";
import { AgentTrackToggle } from "@/components/agents-ui/agent-track-toggle";

export interface CallControlLabels {
  muteMic: string;
  unmuteMic: string;
  turnCameraOff: string;
  turnCameraOn: string;
  endCall: string;
}

const DEFAULT_LABELS: CallControlLabels = {
  muteMic: "Mute microphone",
  unmuteMic: "Unmute microphone",
  turnCameraOff: "Turn camera off",
  turnCameraOn: "Turn camera on",
  endCall: "End call",
};

interface CallControlsProps {
  /**
   * Runs after the room has been disconnected. Both call sites already tear
   * down from LiveKitRoom's onDisconnected, so this is only for extra work.
   */
  onEndCall?: () => void;
  labels?: Partial<CallControlLabels>;
}

export const CallControls: React.FC<CallControlsProps> = ({
  onEndCall,
  labels,
}) => {
  const t = { ...DEFAULT_LABELS, ...labels };
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  const micTracks = useTracks([Track.Source.Microphone]);
  const localMic = useMemo(
    () => micTracks.find((track) => track.participant.isLocal),
    [micTracks],
  );

  return (
    <div className="flex items-center justify-center gap-3 pt-3">
      {/* A pill rather than a circle so the local level fits beside the icon:
          it is the only feedback that your own mic is actually picking up. */}
      <AgentTrackToggle
        source={Track.Source.Microphone}
        variant="outline"
        pressed={isMicrophoneEnabled}
        onPressedChange={(next) =>
          void localParticipant.setMicrophoneEnabled(next)
        }
        className="h-12 w-auto min-w-12 gap-2 rounded-full px-4"
        aria-label={isMicrophoneEnabled ? t.muteMic : t.unmuteMic}
      >
        {isMicrophoneEnabled && (
          <AgentAudioVisualizerBar
            size="icon"
            barCount={3}
            audioTrack={localMic}
            state="speaking"
          />
        )}
      </AgentTrackToggle>

      <AgentTrackToggle
        source={Track.Source.Camera}
        variant="outline"
        pressed={isCameraEnabled}
        onPressedChange={(next) => void localParticipant.setCameraEnabled(next)}
        className="h-12 w-12 rounded-full"
        aria-label={isCameraEnabled ? t.turnCameraOff : t.turnCameraOn}
      />

      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="h-12 w-12 rounded-full"
        aria-label={t.endCall}
        onClick={() => {
          void room.disconnect();
          onEndCall?.();
        }}
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default CallControls;
