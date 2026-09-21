// apps/mobile/src/components/patient-chart/video-call/hooks/uploadCallAudio.ts
//
// Uploads a call's audio to object storage as a durability backup.
//
// Explicitly NOT part of the transcription path. Transcription reads the local
// file — uploading and then downloading the same bytes would burn the patient's
// and clinician's bandwidth for nothing. This exists for one case: the phone is
// lost, wiped or reinstalled before the transcript is written, and the audio
// would otherwise be gone.
//
// Best-effort throughout. A failed upload must never block or fail a job; the
// local file is what actually matters.

import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { updateJob, type TranscriptionJob } from './useCallTranscriptionJobs';
import { isBlockedByWifiOnlyPolicy } from '../../../../utils/networkPreferences';

async function uploadOne(
  sessionId: string,
  path: string,
  speaker: 'doctor' | 'patient',
  token: string | null,
): Promise<boolean> {
  const form = new FormData();
  form.append('file', {
    uri: path.startsWith('file://') ? path : `file://${path}`,
    name: `${speaker}.m4a`,
    type: 'audio/mp4',
  } as unknown as Blob);
  form.append('speaker', speaker);

  const response = await fetch(
    getApiUrl(`/video-call/${sessionId}/upload-audio`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  return response.ok;
}

export async function uploadCallAudio(job: TranscriptionJob): Promise<void> {
  try {
    // ~9 MB for a 25-minute consult. Respect the clinician's data preference:
    // this is a backup, not something worth spending a cellular plan on.
    if (await isBlockedByWifiOnlyPolicy()) return;

    const token = await getStoredToken();
    if (!token) return;

    const [doctorOk, patientOk] = await Promise.all([
      uploadOne(job.sessionId, job.doctorPath, 'doctor', token),
      uploadOne(job.sessionId, job.patientPath, 'patient', token),
    ]);

    if (doctorOk && patientOk) {
      // Recorded so cleanup knows there is a remote object to delete. A partial
      // upload still counts — whatever landed needs removing.
      updateJob(job.jobId, { uploaded: true });
    } else if (doctorOk || patientOk) {
      updateJob(job.jobId, { uploaded: true });
    }
  } catch (err) {
    console.warn('[uploadCallAudio] backup upload failed:', err);
  }
}
