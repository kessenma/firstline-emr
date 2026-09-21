// apps/web/components/patient-chart/PatientNotes/NoteContributors.tsx
// Shows distinct contributors who edited a published note, ordered from least to most contributions.

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Users } from "lucide-react";
import type { NoteEdit } from "@/db/schema/notes";

interface Contributor {
  editorId: string;
  editorName: string;
  editorAccountType: string | null;
  editorCareTeamRole: string | null;
  editCount: number;
}

interface NoteContributorsProps {
  noteId: string;
  patientId: string;
}

export function NoteContributors({ noteId, patientId }: NoteContributorsProps) {
  const [edits, setEdits] = useState<NoteEdit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchEdits() {
      try {
        const res = await fetch(`/api/patient/${patientId}/notes/${noteId}/edits`);
        if (res.ok && !cancelled) {
          setEdits(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch note edits for contributors:", e);
      }
      if (!cancelled) setLoaded(true);
    }
    fetchEdits();
    return () => { cancelled = true; };
  }, [noteId, patientId]);

  const contributors = useMemo((): Contributor[] => {
    const map = new Map<string, Contributor>();
    for (const edit of edits) {
      if (!edit.editorId) continue;
      const existing = map.get(edit.editorId);
      if (existing) {
        existing.editCount++;
      } else {
        map.set(edit.editorId, {
          editorId: edit.editorId,
          editorName: edit.editorName || "Unknown",
          editorAccountType: edit.editorAccountType || null,
          editorCareTeamRole: edit.editorCareTeamRole || null,
          editCount: 1,
        });
      }
    }
    // Sort ascending by edit count (least to most)
    return Array.from(map.values()).sort((a, b) => a.editCount - b.editCount);
  }, [edits]);

  if (!loaded || contributors.length === 0) return null;

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">
          Contributors ({contributors.length})
        </span>
      </div>
      <div className="pl-5 space-y-0.5">
        {contributors.map((c) => (
          <div key={c.editorId} className="flex items-center justify-between text-xs">
            <span>
              <span className="font-medium text-foreground">{c.editorName}</span>
              {(c.editorAccountType || c.editorCareTeamRole) && (
                <span className="text-muted-foreground/70">
                  {" "}({[c.editorAccountType, c.editorCareTeamRole].filter(Boolean).join(" / ")})
                </span>
              )}
            </span>
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {c.editCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
