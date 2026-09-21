// components/calls/useStaffCall.ts
// Places and tears down a staff-to-staff call.
//
// The quiet-hours round trip is the reason this is a state machine rather than
// a single async call: POST /api/calls answers 409 and creates *nothing* when a
// callee is inside their quiet hours, so the caller has to confirm and the
// request has to be replayed with overrideQuietHours. That decision cannot be
// made client-side — user_settings only syncs the owning user's row, so a
// caller's device has no idea what the callee's quiet hours are.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveCall,
  DirectoryUser,
  PlaceCallResponse,
  QuietHoursCallee,
} from "./types";

export type CallPhase =
  | { kind: "idle" }
  | { kind: "placing"; callee: DirectoryUser }
  /** Server refused to ring; awaiting the caller's explicit override. */
  | { kind: "quietHours"; callee: DirectoryUser; blocked: QuietHoursCallee[] }
  | { kind: "active"; call: ActiveCall }
  | { kind: "error"; message: string };

export function useStaffCall() {
  const [phase, setPhase] = useState<CallPhase>({ kind: "idle" });

  // Mirrors the active call id for the unmount/unload teardown, which cannot
  // read state from a stale closure.
  const activeCallIdRef = useRef<string | null>(null);
  // Guards against a double-click placing two calls.
  const placingRef = useRef(false);

  const setPhaseSafe = useCallback((next: CallPhase) => {
    if (next.kind === "active") {
      activeCallIdRef.current = next.call.callId;
    } else if (next.kind !== "quietHours" && next.kind !== "placing") {
      activeCallIdRef.current = null;
    }
    setPhase(next);
  }, []);

  const placeCall = useCallback(
    async (callee: DirectoryUser, opts?: { overrideQuietHours?: boolean }) => {
      if (placingRef.current) return;
      placingRef.current = true;
      setPhaseSafe({ kind: "placing", callee });

      try {
        const res = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calleeIds: [callee.id],
            kind: "audio",
            overrideQuietHours: opts?.overrideQuietHours === true,
          }),
        });

        // Quiet hours: nothing was created. Ask, then replay with the override.
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          if (data?.error === "quiet_hours") {
            setPhaseSafe({
              kind: "quietHours",
              callee,
              blocked: Array.isArray(data.callees) ? data.callees : [],
            });
            return;
          }
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Could not place the call");
        }

        const data: PlaceCallResponse = await res.json();
        if (!data.token || !data.url) {
          throw new Error("Calling is not configured on this server");
        }

        setPhaseSafe({
          kind: "active",
          call: {
            callId: data.call.id,
            roomName: data.call.roomName,
            kind: data.call.kind,
            token: data.token,
            serverUrl: data.url,
            callee,
            deliverable: data.deliverable,
            callees: data.callees ?? [],
          },
        });
      } catch (err) {
        console.error("Error placing call:", err);
        setPhaseSafe({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Could not place the call",
        });
      } finally {
        placingRef.current = false;
      }
    },
    [setPhaseSafe],
  );

  const confirmQuietHours = useCallback(() => {
    if (phase.kind !== "quietHours") return;
    void placeCall(phase.callee, { overrideQuietHours: true });
  }, [phase, placeCall]);

  const endCall = useCallback(
    async (reason: string = "hangup") => {
      const callId = activeCallIdRef.current;
      activeCallIdRef.current = null;
      setPhaseSafe({ kind: "idle" });

      if (!callId) return;
      try {
        await fetch(`/api/calls/${callId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } catch (err) {
        // The LiveKit room_finished webhook is the authoritative fallback, so a
        // failure here delays the log rather than corrupting it.
        console.error("Error ending call:", err);
      }
    },
    [setPhaseSafe],
  );

  const dismiss = useCallback(() => {
    setPhaseSafe({ kind: "idle" });
  }, [setPhaseSafe]);

  // Close out a call the user walks away from. Without this the row sits in
  // `ringing` until the webhook fires, and the callee's phone keeps ringing.
  useEffect(() => {
    const teardown = () => {
      const callId = activeCallIdRef.current;
      if (!callId) return;
      activeCallIdRef.current = null;
      // keepalive lets the request outlive the page.
      void fetch(`/api/calls/${callId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "hangup" }),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", teardown);
    return () => {
      window.removeEventListener("pagehide", teardown);
      teardown();
    };
  }, []);

  return { phase, placeCall, confirmQuietHours, endCall, dismiss };
}
