// apps/mobile/src/components/patient-chart/video-call/hooks/useCallTranscriptionJobs.ts
//
// Crash-safe job store for post-call transcription.
//
// A 25-minute consult that dies to an OOM kill on its last minute must not lose
// the whole transcript, and audio left on disk must not linger. Jobs therefore
// live in MMKV — synchronous, mmap-backed, and survives SIGKILL — rather than
// in React state, and a sweep on launch picks up whatever was interrupted.
//
// This module owns persistence only. Running a job is useCallRecording's job.

import { storage } from '../../../../utils/mmkv';

const JOB_PREFIX = 'call_transcription_job:';

export type TranscriptionJobStatus =
  | 'pending'
  | 'transcribing'
  | 'done'
  | 'failed';

export interface TranscriptionJob {
  jobId: string;
  sessionId: string;
  patientId: string;
  patientEmail: string;
  patientName: string;
  doctorPath: string;
  patientPath: string;
  doctorLocale: string;
  patientLocale: string;
  languageSupported: boolean;
  callStartedAt: string;
  durationSeconds: number | null;
  droppedFrames: number;
  status: TranscriptionJobStatus;
  attempts: number;
  error?: string;
  /** Author of the resulting note. Captured at enqueue time because the job
   *  outlives the screen that created it. */
  authorId?: string;
  authorName?: string;
  /** True once a backup copy reached object storage, so cleanup knows whether
   *  there is a remote object to delete. */
  uploaded?: boolean;
  /** Set once the note exists, so a retry cannot create a duplicate. */
  noteId?: string;
}

function keyFor(jobId: string): string {
  return `${JOB_PREFIX}${jobId}`;
}

export function saveJob(job: TranscriptionJob): void {
  storage.set(keyFor(job.jobId), JSON.stringify(job));
}

export function readJob(jobId: string): TranscriptionJob | null {
  const raw = storage.getString(keyFor(jobId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TranscriptionJob;
  } catch {
    // Corrupt entry is worse than none — drop it so the sweep doesn't loop.
    storage.remove(keyFor(jobId));
    return null;
  }
}

export function deleteJob(jobId: string): void {
  storage.remove(keyFor(jobId));
}

export function listJobs(): TranscriptionJob[] {
  return storage
    .getAllKeys()
    .filter(k => k.startsWith(JOB_PREFIX))
    .map(k => {
      const raw = storage.getString(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as TranscriptionJob;
      } catch {
        storage.remove(k);
        return null;
      }
    })
    .filter((j): j is TranscriptionJob => j !== null);
}

/**
 * Jobs the resume sweep should act on.
 *
 * `transcribing` counts as unfinished: a job in that state when the process
 * died was interrupted mid-run, and its audio is still on disk. `done` jobs
 * are returned too — they may have persisted the note but crashed before
 * cleaning up their audio, and leaving consult audio on the device is exactly
 * what the cleanup exists to prevent.
 */
export function resumableJobs(): TranscriptionJob[] {
  return listJobs().filter(
    j => j.status === 'pending' || j.status === 'transcribing' || j.status === 'done',
  );
}

export function updateJob(
  jobId: string,
  patch: Partial<TranscriptionJob>,
): TranscriptionJob | null {
  const existing = readJob(jobId);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  saveJob(next);
  return next;
}
