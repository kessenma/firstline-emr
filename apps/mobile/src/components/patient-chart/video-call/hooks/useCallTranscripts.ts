// apps/mobile/src/components/patient-chart/video-call/hooks/useCallTranscripts.ts
//
// Reads Patient Call transcript notes for a patient, offline-first.
//
// Transcripts are `notes` rows rather than their own table, so they arrive on
// every device through the existing sync with no new bucket, no sync-rules
// change, and no PowerSync schema change — note_type is a plain text column.
// The link back to the call lives in the content JSON.

import { useMemo } from 'react';
import { usePowerSyncQuery } from '../../../../hooks/powersync/usePowerSyncQuery';
import { TABLES } from '../../../../db/powerSyncSchema';
import type { PatientCallNoteContent } from '../../../../types/notes';

export interface CallTranscript {
  noteId: string;
  draft: boolean;
  date: string;
  content: PatientCallNoteContent;
}

interface TranscriptRow {
  id: string;
  content: string | null;
  draft: number;
  date: string;
}

export function useCallTranscripts(patientId: string | undefined) {
  const { data, isLoading } = usePowerSyncQuery<TranscriptRow>(
    `SELECT id, content, draft, date
       FROM ${TABLES.NOTES}
      WHERE patient_id = ? AND note_type = 'patient_call'
      ORDER BY date DESC`,
    [patientId ?? ''],
    { enabled: !!patientId },
  );

  const transcripts = useMemo<CallTranscript[]>(() => {
    if (!data) return [];
    return data
      .map(row => {
        if (!row.content) return null;
        try {
          const content = JSON.parse(row.content) as PatientCallNoteContent;
          if (!content?.videoCallSessionId) return null;
          return {
            noteId: row.id,
            draft: row.draft === 1,
            date: row.date,
            content,
          };
        } catch {
          // A malformed transcript should not take out the whole list.
          return null;
        }
      })
      .filter((t): t is CallTranscript => t !== null);
  }, [data]);

  /** Indexed by video call session, for pairing with call-history rows. */
  const bySessionId = useMemo(() => {
    const map = new Map<string, CallTranscript>();
    for (const t of transcripts) {
      // Newest wins — the query is already date-desc, so only set once.
      if (!map.has(t.content.videoCallSessionId)) {
        map.set(t.content.videoCallSessionId, t);
      }
    }
    return map;
  }, [transcripts]);

  return { transcripts, bySessionId, loading: isLoading };
}
