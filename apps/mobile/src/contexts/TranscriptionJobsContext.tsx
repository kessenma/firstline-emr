// apps/mobile/src/contexts/TranscriptionJobsContext.tsx
//
// App-level runner for post-call transcription jobs.
//
// Deliberately NOT inside VideoCallSessionProvider. That provider unmounts the
// moment the clinician leaves the patient chart, which is exactly what people
// do after hanging up — so a chart-scoped runner would orphan almost every job
// it started. Transcription outlives the screen that produced it.
//
// Owns: the queue, running jobs to completion, the note write, cleanup, the
// launch/foreground resume sweep, progress reporting and the completion
// notification. Recording itself stays with the call (useCallRecording), which
// only hands a finished job over.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { CallTranscription } from '../native/NativeCallTranscription';
import { ORTHOPEDIC_VOCABULARY } from '../components/patient-chart/notes/voice-dictation/medicalVocabulary';
import { useNoteMutations } from '../hooks/useNotes';
import { useDownloadProgress } from './DownloadProgressContext';
import { pushNotificationService } from '../services/PushNotificationService';
import type { PatientCallNoteContent } from '../types/notes';
import {
  deleteJob,
  listJobs,
  readJob,
  resumableJobs,
  saveJob,
  updateJob,
  type TranscriptionJob,
} from '../components/patient-chart/video-call/hooks/useCallTranscriptionJobs';

const ENGINE = 'apple-speechanalyzer';

export interface TranscriptionJobView extends TranscriptionJob {
  /** 0–1 while running. */
  progress: number;
}

interface TranscriptionJobsValue {
  jobs: TranscriptionJobView[];
  /** Job currently being transcribed, if any. */
  activeJob: TranscriptionJobView | null;
  enqueue: (job: TranscriptionJob) => void;
  retry: (jobId: string) => void;
  dismiss: (jobId: string) => void;
  /** Jobs for one patient — drives the chart banner. */
  jobsForPatient: (patientId: string) => TranscriptionJobView[];
}

const TranscriptionJobsContext = createContext<TranscriptionJobsValue | null>(
  null,
);

export function useTranscriptionJobs(): TranscriptionJobsValue {
  const context = useContext(TranscriptionJobsContext);
  if (!context) {
    // Graceful no-op rather than a throw: this provider sits high in the tree,
    // and a screen rendered outside it should degrade, not crash.
    return {
      jobs: [],
      activeJob: null,
      enqueue: () => {},
      retry: () => {},
      dismiss: () => {},
      jobsForPatient: () => [],
    };
  }
  return context;
}

export const TranscriptionJobsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [jobs, setJobs] = useState<TranscriptionJobView[]>([]);
  const [progressById, setProgressById] = useState<Record<string, number>>({});

  const { createNote } = useNoteMutations();
  const download = useDownloadProgress();

  // Guards against two runners racing the same job — the launch sweep and a
  // fresh enqueue can otherwise collide.
  const runningRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(() => {
    setJobs(
      listJobs().map(job => ({ ...job, progress: 0 })),
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---- Running a job ----

  const runJob = useCallback(
    async (job: TranscriptionJob) => {
      if (runningRef.current.has(job.jobId)) return;
      runningRef.current.add(job.jobId);

      const progressId = `transcription-${job.jobId}`;
      download.register({
        id: progressId,
        label: `Call notes · ${job.patientName}`,
        progress: 0,
        type: 'transcription',
      });

      updateJob(job.jobId, {
        status: 'transcribing',
        attempts: job.attempts + 1,
      });
      refresh();

      const subscription = CallTranscription.addListener(
        'onTranscriptionProgress',
        event => {
          if (event.jobId !== job.jobId) return;
          setProgressById(prev => ({ ...prev, [job.jobId]: event.fraction }));
          download.update(progressId, event.fraction);
        },
      );

      try {
        const segments = await CallTranscription.transcribe({
          jobId: job.jobId,
          doctorPath: job.doctorPath,
          patientPath: job.patientPath,
          doctorLocale: job.doctorLocale,
          patientLocale: job.patientLocale,
          contextualStrings: ORTHOPEDIC_VOCABULARY,
        });

        // A retry must never write a second transcript for the same call.
        const current = readJob(job.jobId);
        if (!current?.noteId) {
          const content: PatientCallNoteContent = {
            videoCallSessionId: job.sessionId,
            callStartedAt: job.callStartedAt,
            durationSeconds: job.durationSeconds,
            mode: 'post_call',
            doctorLocale: job.doctorLocale,
            patientLocale: job.patientLocale,
            languageSupported: job.languageSupported,
            engine: ENGINE,
            droppedFrames: job.droppedFrames,
            segments: segments.map(s => ({
              speaker: s.speaker,
              text: s.text,
              startMs: s.startMs,
              endMs: s.endMs,
            })),
          };

          const noteId = await createNote({
            patientId: job.patientId,
            noteType: 'patient_call',
            content,
            email: job.patientEmail,
            authorId: job.authorId,
            authorName: job.authorName,
            // Always a draft. An unread machine transcript entering the
            // published record is the failure this feature must not have.
            draft: true,
          });
          updateJob(job.jobId, { noteId: String(noteId) });
        }

        updateJob(job.jobId, { status: 'done' });

        // Transcript is in PowerSync; the audio has done its job. Remote first
        // — a failed local delete just leaves a cache file, but consult audio
        // sitting in object storage is the exposure worth clearing.
        await deleteRemoteAudio(job);
        await CallTranscription.discardRecording(job.sessionId);
        deleteJob(job.jobId);

        void pushNotificationService.displayNotification({
          title: 'Call notes ready',
          body: `Transcript saved as a draft note for ${job.patientName}.`,
          data: { type: 'transcription_complete', patientId: job.patientId },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Transcription failed';
        console.warn('[TranscriptionJobs] failed:', message);
        // Audio is retained on purpose so Retry has something to work from.
        updateJob(job.jobId, { status: 'failed', error: message });

        void pushNotificationService.displayNotification({
          title: 'Could not write call notes',
          body: `Tap to retry for ${job.patientName}. The recording is still on this device.`,
          data: { type: 'transcription_complete', patientId: job.patientId },
        });
      } finally {
        subscription.remove();
        runningRef.current.delete(job.jobId);
        download.complete(progressId);
        setProgressById(prev => {
          const next = { ...prev };
          delete next[job.jobId];
          return next;
        });
        refresh();
      }
    },
    [createNote, download, refresh],
  );

  // ---- Resume sweep ----
  //
  // iOS grants no long-running background compute, so an interrupted job waits
  // for the app to come back rather than for a scheduler that may not fire
  // until the device is charging overnight. Runs on mount and on every
  // foreground, which is what actually completes most interrupted jobs.
  const sweep = useCallback(() => {
    if (!CallTranscription.isModuleAvailable()) return;

    for (const job of resumableJobs()) {
      if (job.status === 'done') {
        // Note was written but cleanup never ran.
        void (async () => {
          await deleteRemoteAudio(job);
          await CallTranscription.discardRecording(job.sessionId);
          deleteJob(job.jobId);
          refresh();
        })();
        continue;
      }
      void runJob(job);
    }
  }, [runJob, refresh]);

  useEffect(() => {
    sweep();

    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') sweep();
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [sweep]);

  // ---- Public API ----

  const enqueue = useCallback(
    (job: TranscriptionJob) => {
      // Persist BEFORE running: if the process dies mid-run, the sweep finds
      // the job and its audio rather than losing both.
      saveJob(job);
      refresh();
      void runJob(job);
    },
    [runJob, refresh],
  );

  const retry = useCallback(
    (jobId: string) => {
      const job = readJob(jobId);
      if (job) void runJob(job);
    },
    [runJob],
  );

  const dismiss = useCallback(
    (jobId: string) => {
      const job = readJob(jobId);
      if (job) void CallTranscription.discardRecording(job.sessionId);
      deleteJob(jobId);
      refresh();
    },
    [refresh],
  );

  const withProgress = useMemo(
    () => jobs.map(job => ({ ...job, progress: progressById[job.jobId] ?? 0 })),
    [jobs, progressById],
  );

  const value = useMemo<TranscriptionJobsValue>(
    () => ({
      jobs: withProgress,
      activeJob:
        withProgress.find(j => j.status === 'transcribing') ?? null,
      enqueue,
      retry,
      dismiss,
      jobsForPatient: (patientId: string) =>
        withProgress.filter(j => j.patientId === patientId),
    }),
    [withProgress, enqueue, retry, dismiss],
  );

  return (
    <TranscriptionJobsContext.Provider value={value}>
      {children}
    </TranscriptionJobsContext.Provider>
  );
};

/** Best-effort removal of the backup copy in object storage. */
async function deleteRemoteAudio(job: TranscriptionJob): Promise<void> {
  if (!job.uploaded) return;
  try {
    const { getApiUrl } = await import('../config');
    const { getStoredToken } = await import('../utils/storage');
    const token = await getStoredToken();
    await fetch(getApiUrl(`/video-call/${job.sessionId}/audio`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn('[TranscriptionJobs] remote audio delete failed:', err);
  }
}
