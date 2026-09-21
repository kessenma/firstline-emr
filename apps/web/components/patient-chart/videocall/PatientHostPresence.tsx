// apps/web/components/patient-chart/videocall/PatientHostPresence.tsx
//
// The patient's safety net for a consult that ends without anyone saying so.
//
// The deliberate path is handled server-side: a clinician who hangs up hits
// /api/video-call/end, which deletes the room and disconnects everyone. This
// covers the other path — the clinician's phone crashes, loses signal, or is
// force-quit mid-call, so that request never lands and the patient is left
// alone in a live room staring at "waiting for your doctor to join".
//
// Deliberately client-side and patient-side only. Nothing here needs to be
// authoritative: once the patient leaves, the room is empty and LiveKit's own
// empty_timeout finishes it, which fires the room_finished webhook that closes
// the log and revokes the invite. This component's only job is to stop the
// patient waiting forever, and to tell them why.
"use client";

import React, { useEffect, useState } from "react";
import { useRemoteParticipants, useRoomContext } from "@livekit/components-react";

/**
 * How long the patient waits alone before the call is called off.
 *
 * Not a snap judgement, on purpose. A clinician who walks out of signal, gets a
 * phone call, or whose app is backgrounded long enough to be reaped comes back
 * to the same room and the consult continues. Ending at the first sign of
 * absence would drop calls that were never in trouble — and the LiveKit signal
 * connection on mobile is observably flappy, so brief absences are expected.
 */
const HOST_ABSENT_GRACE_MS = 5 * 60 * 1000;

export interface HostPresenceLabels {
  /** Shown while the clinician is gone but still within the grace period. */
  hostLeftWaiting: string;
}

interface PatientHostPresenceProps {
  labels: HostPresenceLabels;
  /**
   * Called once the grace period lapses, immediately before this component
   * disconnects the room. The parent uses it to render "your doctor ended the
   * call" rather than a bare "call ended" — a disconnect this component
   * initiates arrives as CLIENT_INITIATED, which is indistinguishable from the
   * patient pressing hang up.
   */
  onHostAbsent: () => void;
}

export const PatientHostPresence: React.FC<PatientHostPresenceProps> = ({
  labels,
  onHostAbsent,
}) => {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const hostPresent = remoteParticipants.length > 0;

  // Absence only means something after a presence. A patient who opens the link
  // early is *waiting* for the clinician, not abandoned by them — the stage
  // already says so, and starting a countdown then would hang up on a consult
  // that has not begun.
  const [hostHasJoined, setHostHasJoined] = useState(false);
  useEffect(() => {
    if (hostPresent) setHostHasJoined(true);
  }, [hostPresent]);

  const waiting = hostHasJoined && !hostPresent;

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      onHostAbsent();
      void room.disconnect();
    }, HOST_ABSENT_GRACE_MS);
    // Cleared the moment they rejoin, so the grace period restarts in full for
    // any later absence rather than carrying over.
    return () => clearTimeout(timer);
  }, [waiting, room, onHostAbsent]);

  if (!waiting) return null;

  return (
    // Below the stage's top row: the fit toggle sits top-left and the local
    // picture-in-picture top-right.
    <div className="absolute left-1/2 top-16 z-30 w-[min(90%,28rem)] -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 text-center text-sm text-white shadow-lg">
      {labels.hostLeftWaiting}
    </div>
  );
};

export default PatientHostPresence;
