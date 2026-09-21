// apps/web/components/patient-chart/PatientNotes/TranscriptBlock.tsx
//
// Web rendering of a Patient Call transcript.
//
// Mirrors the mobile TranscriptView so the disclaimers cannot drift between
// platforms. The "not reviewed" banner is what makes it safe to keep a machine
// transcript in a chart at all, so it is rendered unconditionally rather than
// being a prop.

"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  formatSegmentTime,
  MACHINE_TRANSCRIPT_DISCLAIMER,
  UNSUPPORTED_LANGUAGE_DISCLAIMER,
  type PatientCallNoteContent,
} from "@fajr/shared/patient";

interface TranscriptBlockProps {
  content: PatientCallNoteContent;
  patientName?: string;
}

export const TranscriptBlock: React.FC<TranscriptBlockProps> = ({
  content,
  patientName = "Patient",
}) => {
  const segments = content.segments ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {MACHINE_TRANSCRIPT_DISCLAIMER}
        </span>
      </div>

      {content.languageSupported === false && (
        <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {UNSUPPORTED_LANGUAGE_DISCLAIMER}
          </span>
        </div>
      )}

      {content.droppedFrames > 0 && (
        <p className="text-xs italic text-muted-foreground">
          Some audio was dropped during this call — the transcript may have gaps.
        </p>
      )}

      {segments.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No speech was captured during this call.
        </p>
      ) : (
        <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto">
          {segments.map((segment, index) => {
            const isDoctor = segment.speaker === "doctor";
            return (
              <div
                key={`${segment.speaker}-${segment.startMs}-${index}`}
                className="flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      isDoctor
                        ? "text-xs font-semibold text-muted-foreground"
                        : "text-xs font-semibold text-primary"
                    }
                  >
                    {isDoctor ? "Clinician" : patientName}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground/70">
                    {formatSegmentTime(segment.startMs)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {segment.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TranscriptBlock;
