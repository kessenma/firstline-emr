// apps/web/components/patient-chart/videocall/CallHistoryList.tsx
"use client";

import React, { useState } from "react";
import { PhoneMissed, Video, Loader2, Check } from "lucide-react";
import {
  VIDEO_CALL_STATUS_LABELS,
  formatCallDuration,
  type VideoCallSession,
} from "@fajr/shared/video-call";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CallHistoryListProps {
  sessions: VideoCallSession[];
  loading: boolean;
  onSaveNotes: (sessionId: string, notes: string) => Promise<boolean>;
}

const formatWhen = (iso: string | null): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const CallHistoryList: React.FC<CallHistoryListProps> = ({
  sessions,
  loading,
  onSaveNotes,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const beginEdit = (session: VideoCallSession) => {
    setEditingId(session.id);
    setDraft(session.callNotes ?? "");
  };

  const save = async (sessionId: string) => {
    setSaving(true);
    const ok = await onSaveNotes(sessionId, draft);
    setSaving(false);
    if (ok) setEditingId(null);
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading call history…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="py-6 text-sm italic text-muted-foreground">
        No video calls with this patient yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sessions.map((session) => {
        const missed = session.status === "missed";

        return (
          <li key={session.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                {missed ? (
                  <PhoneMissed className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {formatWhen(session.startedAt ?? session.createdAt)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.startedByName ?? "Unknown clinician"}
                    {" · "}
                    {missed
                      ? VIDEO_CALL_STATUS_LABELS[session.status]
                      : formatCallDuration(session.durationSeconds)}
                  </p>
                </div>
              </div>

              {session.status !== "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    editingId === session.id
                      ? setEditingId(null)
                      : beginEdit(session)
                  }
                >
                  {session.callNotes ? "Edit note" : "Add note"}
                </Button>
              )}
            </div>

            {editingId === session.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="What was discussed on this call?"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => save(session.id)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-3 w-3" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              session.callNotes && (
                <p className="mt-1 whitespace-pre-wrap pl-6 text-sm text-muted-foreground">
                  {session.callNotes}
                </p>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default CallHistoryList;
