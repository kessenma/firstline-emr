// components/calls/AudioCallDialog.tsx
// The in-progress audio call surface.
//
// Deliberately NOT <VideoConference /> — that prefab renders camera tiles and a
// device bar sized for video. This is audio only, and the token's grant only
// carries canPublishSources: [MICROPHONE], so a video prefab would render
// controls the server would refuse anyway.
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  type AgentState,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { AgentAudioVisualizerBar } from "@/components/agents-ui/agent-audio-visualizer-bar";
import { AgentTrackToggle } from "@/components/agents-ui/agent-track-toggle";
import { AlertTriangle, PhoneOff } from "lucide-react";
import { cn } from "@/utils/classNames";
import {
  type ActiveCall,
  displayName,
  formatDuration,
  initialsOf,
} from "./types";

interface AudioCallDialogProps {
  call: ActiveCall;
  onHangUp: (reason?: string) => void;
}

export function AudioCallDialog({ call, onHangUp }: AudioCallDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Closing the dialog is a hang-up — never leave the room orphaned.
        if (!open) onHangUp("hangup");
      }}
    >
      <DialogContent size="sm" scrollable={false}>
        <DialogHeader>
          <DialogTitle>Audio call</DialogTitle>
        </DialogHeader>

        <LiveKitRoom
          token={call.token}
          serverUrl={call.serverUrl}
          connect
          audio
          video={false}
          onDisconnected={() => onHangUp("hangup")}
          onError={(err) => {
            console.error("LiveKit room error:", err);
            onHangUp("failed");
          }}
        >
          {/* Renders the <audio> elements for every remote track. Without it
              there is no audio output at all. */}
          <RoomAudioRenderer />
          <CallSurface call={call} onHangUp={onHangUp} />
        </LiveKitRoom>
      </DialogContent>
    </Dialog>
  );
}

function CallSurface({
  call,
  onHangUp,
}: {
  call: ActiveCall;
  onHangUp: (reason?: string) => void;
}) {
  const connectionState = useConnectionState();
  const remotes = useRemoteParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const answered = remotes.length > 0;

  // Track references rather than raw participants: useTracks re-renders on
  // publish/subscribe, so the visualiser starts moving the moment the far side
  // actually sends audio rather than the moment they join the room.
  const micTracks = useTracks([Track.Source.Microphone]);
  const remoteMic = useMemo(
    () => micTracks.find((t) => !t.participant.isLocal),
    [micTracks],
  );
  const localMic = useMemo(
    () => micTracks.find((t) => t.participant.isLocal),
    [micTracks],
  );

  // There is no AI agent in this call, so nothing publishes an agent state —
  // we compute one. Only three of the AgentState values matter to the bar
  // visualiser: "connecting" sweeps, "listening" pulses the centre bar, and
  // "speaking" is the only value that maps bar height to actual volume.
  const visualizerState: AgentState =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting
      ? "connecting"
      : answered
        ? "speaking"
        : "listening";

  // Timer starts when the far side actually joins, not when we connected —
  // otherwise the caller sees a duration ticking while it is still ringing.
  const answeredAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!answered) return;
    if (answeredAtRef.current === null) answeredAtRef.current = Date.now();

    const id = setInterval(() => {
      if (answeredAtRef.current !== null) {
        setElapsed(Math.floor((Date.now() - answeredAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [answered]);

  const status = answered
    ? formatDuration(elapsed)
    : connectionState === ConnectionState.Connecting ||
        connectionState === ConnectionState.Reconnecting
      ? "Connecting…"
      : call.deliverable
        ? "Ringing…"
        : "Not reachable";

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <Avatar
        src={call.callee.image ?? undefined}
        initials={initialsOf(call.callee)}
        className="h-20 w-20"
      />

      {/* Carries the ringing affordance the Avatar's animate-pulse used to,
          and once answered becomes the only thing on screen that proves audio
          is actually arriving. Bars inherit currentColor. */}
      <AgentAudioVisualizerBar
        size="sm"
        barCount={5}
        audioTrack={remoteMic}
        state={visualizerState}
        className="text-primary"
      />

      <div className="text-center">
        <p className="text-lg font-semibold">{displayName(call.callee)}</p>
        <p
          className={cn(
            "text-sm tabular-nums",
            answered ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          {status}
        </p>
      </div>

      {/* Unreachable is a dead end, not a slow ring: notifications are off or
          no VoIP device is registered. Distinct from quiet hours, and not
          something the caller can override — so say so instead of spinning. */}
      {!call.deliverable && !answered && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {displayName(call.callee)} won&apos;t be notified — they have call
            notifications turned off or no registered device. They can still
            join if they open the app.
          </span>
        </div>
      )}

      {/* Browser autoplay policy blocks remote audio until a user gesture.
          StartAudio renders itself only when playback is actually blocked;
          without it the call connects and the user simply hears nothing. */}
      <StartAudio
        label="Click to enable audio"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      />

      <div className="flex items-center gap-3">
        {/* A pill rather than a circle so the local mic level fits beside the
            icon — it is the only confirmation the caller gets that their own
            mic is being picked up. */}
        <AgentTrackToggle
          source={Track.Source.Microphone}
          variant="outline"
          pressed={isMicrophoneEnabled}
          onPressedChange={(next) =>
            void localParticipant.setMicrophoneEnabled(next)
          }
          className="h-12 w-auto min-w-12 gap-2 rounded-full px-4"
          aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
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

        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          aria-label="Hang up"
          onClick={() => onHangUp("hangup")}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
