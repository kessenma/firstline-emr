// apps/web/components/messages/CallSummaryMessage.tsx
//
// Renders a `call-summary` message — the record /api/calls/[id]/end drops into
// the participants' staff thread when a call finishes.
//
// Modeled on PatientCardMessage: the message `text` is JSON, and this component
// is what stops the raw payload being printed. InternalMessageList falls
// through to plain text for unknown types, so this must stay wired up.
"use client";

import React, { useMemo } from "react";
import { Phone, PhoneMissed, PhoneOff } from "lucide-react";
import {
  parseCallSummary,
  formatDuration,
  type CallSummaryPayload,
} from "@fajr/shared/calls";
import { cn } from "@/lib/utils";

interface CallSummaryMessageProps {
  messageText: string;
  isSelf?: boolean;
}

/** Human phrasing per terminal status, from the reader's point of view. */
function describe(payload: CallSummaryPayload): {
  label: string;
  Icon: typeof Phone;
  tone: "normal" | "muted" | "bad";
} {
  switch (payload.status) {
    case "completed":
      return { label: "Call ended", Icon: Phone, tone: "normal" };
    case "missed":
      return { label: "Missed call", Icon: PhoneMissed, tone: "bad" };
    case "declined":
      return { label: "Call declined", Icon: PhoneOff, tone: "muted" };
    case "canceled":
      return { label: "Call canceled", Icon: PhoneOff, tone: "muted" };
    case "failed":
      return { label: "Call failed", Icon: PhoneOff, tone: "bad" };
    default:
      return { label: "Call", Icon: Phone, tone: "normal" };
  }
}

export function CallSummaryMessage({
  messageText,
  isSelf,
}: CallSummaryMessageProps) {
  const payload = useMemo(() => parseCallSummary(messageText), [messageText]);

  if (!payload) {
    return (
      <p className="text-xs italic text-muted-foreground">
        [Unreadable call summary]
      </p>
    );
  }

  const { label, Icon, tone } = describe(payload);
  const started = new Date(payload.startedAt);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2",
        isSelf ? "bg-primary/5" : "bg-muted/40",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          tone === "bad" && "text-destructive",
          tone === "muted" && "text-muted-foreground",
          tone === "normal" && "text-primary",
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {label}
          {payload.kind === "video" && (
            <span className="text-muted-foreground font-normal"> · video</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {Number.isNaN(started.getTime())
            ? ""
            : started.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
          {payload.durationSeconds != null && payload.durationSeconds > 0
            ? ` · ${formatDuration(payload.durationSeconds)}`
            : ""}
        </p>
      </div>
    </div>
  );
}

export default CallSummaryMessage;
