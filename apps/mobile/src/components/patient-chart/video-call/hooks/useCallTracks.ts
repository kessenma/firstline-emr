// apps/mobile/src/components/patient-chart/video-call/hooks/useCallTracks.ts
//
// Resolves the camera and microphone TrackReferences for the two sides of a
// consult. The mic references feed the bar visualisers — they are what keeps
// the other person present on screen when their camera is off.
//
// Uses the Room instance from VideoCallSessionProvider directly rather than
// components-react's useTracks(), because the Room has to be reachable from
// inside the BottomSheet Portal (which detaches the context tree) and our own
// context bridge is what crosses it.
import { useEffect, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type TrackPublication,
} from 'livekit-client';
import type { TrackReference } from '@livekit/components-react';

interface CallTracks {
  remote: TrackReference | undefined;
  local: TrackReference | undefined;
  remoteMic: TrackReference | undefined;
  localMic: TrackReference | undefined;
  hasRemoteParticipant: boolean;
}

const referenceFor = (
  participant: Participant | undefined,
  source: Track.Source,
): TrackReference | undefined => {
  if (!participant) return undefined;

  const pool =
    source === Track.Source.Microphone
      ? participant.audioTrackPublications
      : participant.videoTrackPublications;

  const publication = Array.from(pool.values()).find(
    (pub: TrackPublication) => pub.source === source && !!pub.track,
  );

  if (!publication) return undefined;

  return { participant, publication, source } as TrackReference;
};

export function useCallTracks(room: Room): CallTracks {
  const [tracks, setTracks] = useState<CallTracks>({
    remote: undefined,
    local: undefined,
    remoteMic: undefined,
    localMic: undefined,
    hasRemoteParticipant: false,
  });

  useEffect(() => {
    const recompute = () => {
      const remoteParticipant = Array.from(
        room.remoteParticipants.values(),
      )[0];

      setTracks({
        remote: referenceFor(remoteParticipant, Track.Source.Camera),
        local: referenceFor(room.localParticipant, Track.Source.Camera),
        remoteMic: referenceFor(remoteParticipant, Track.Source.Microphone),
        localMic: referenceFor(room.localParticipant, Track.Source.Microphone),
        hasRemoteParticipant: !!remoteParticipant,
      });
    };

    recompute();

    // Every event that can change which camera or microphone tracks exist.
    const events: RoomEvent[] = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.Connected,
      RoomEvent.Disconnected,
    ];

    events.forEach((event) => room.on(event, recompute));
    return () => {
      events.forEach((event) => room.off(event, recompute));
    };
  }, [room]);

  return tracks;
}
