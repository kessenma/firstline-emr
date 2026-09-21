// components/calls/CallLauncher.tsx
// Single entry point for placing a staff call: the phone button plus every
// dialog the flow can land in. Host surfaces (the Messages header today) render
// just this, so they don't have to know about the quiet-hours round trip.
//
// Web places calls but does not receive them: there is no signalling channel to
// a browser, and a closed tab cannot ring. Incoming calls are the mobile
// CallKit track.
"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Phone } from "lucide-react";
import { CallDirectoryDialog } from "./CallDirectoryDialog";
import { AudioCallDialog } from "./AudioCallDialog";
import { useStaffCall } from "./useStaffCall";
import type { DirectoryUser } from "./types";

interface CallLauncherProps {
  className?: string;
}

export function CallLauncher({ className }: CallLauncherProps) {
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const { phase, placeCall, confirmQuietHours, endCall, dismiss } =
    useStaffCall();

  const handleSelect = useCallback(
    (user: DirectoryUser) => {
      void placeCall(user);
    },
    [placeCall],
  );

  // Close the directory as soon as the call is live so it isn't stacked behind
  // the call dialog. Kept open through `placing` and `quietHours` so cancelling
  // returns the user to the list they were browsing.
  React.useEffect(() => {
    if (phase.kind === "active") setDirectoryOpen(false);
  }, [phase.kind]);

  const placingUserId = phase.kind === "placing" ? phase.callee.id : null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        aria-label="Call a colleague"
        title="Call a colleague"
        onClick={() => setDirectoryOpen(true)}
      >
        <Phone className="h-4 w-4" />
      </Button>

      <CallDirectoryDialog
        open={directoryOpen}
        onOpenChange={setDirectoryOpen}
        onSelect={handleSelect}
        placingUserId={placingUserId}
      />

      {/* Quiet hours: the server created nothing and is asking permission to
          interrupt. Confirming replays the request with overrideQuietHours. */}
      <ConfirmModal
        isOpen={phase.kind === "quietHours"}
        onClose={dismiss}
        title="They're in quiet hours"
        size="sm"
        message={
          phase.kind === "quietHours" ? (
            <div className="space-y-2">
              <p>
                {phase.blocked.length === 1 && phase.blocked[0]
                  ? `${phase.blocked[0].name} has quiet hours on${
                      phase.blocked[0].until
                        ? ` until ${phase.blocked[0].until}`
                        : ""
                    }.`
                  : "Some people you're calling have quiet hours on."}
              </p>
              <p className="text-muted-foreground">
                Calling anyway will ring their device.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Call anyway"
        cancelText="Cancel"
        onConfirm={confirmQuietHours}
      />

      <ConfirmModal
        isOpen={phase.kind === "error"}
        onClose={dismiss}
        title="Call failed"
        size="sm"
        message={phase.kind === "error" ? phase.message : ""}
        confirmText="OK"
        cancelText="Close"
        onConfirm={dismiss}
      />

      {phase.kind === "active" && (
        <AudioCallDialog
          call={phase.call}
          onHangUp={(reason) => void endCall(reason)}
        />
      )}
    </>
  );
}
