export type NoteType =
  | 'procedure'
  | 'subjective'
  | 'blank'
  | 'triage'
  | 'patient_call';

export interface ProcedureNoteContent {
  attendingPhysician: string;
  procedureName: string;
  diagnosis: string;
  cptCodes?: Array<{ code: string; description: string }>;
  icd10Codes?: Array<{ code: string; description: string }>;
  notes: string;
  plan: string;
}

export interface SubjectiveNoteContent {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes?: Array<{ code: string; description: string }>;
  cptCodes?: Array<{ code: string; description: string }>;
}

export interface BlankNoteContent {
  noteField: string;
}

export interface TriageNoteContent {
  triageDetails: string;
}

export type TranscriptSpeaker = 'doctor' | 'patient';

export interface TranscriptSegment {
  speaker: TranscriptSpeaker;
  text: string;
  /** Milliseconds from the start of the call. Both speakers share one
   *  timeline, so segments interleave by comparing these directly. */
  startMs: number;
  endMs: number;
}

/**
 * A machine transcript of a video consult, produced on the clinician's device.
 *
 * Deliberately its own note type rather than a SOAP note: SOAP is a clinician's
 * own reasoning, and folding an unreviewed machine transcript into it would
 * blur who said what. This is a memory aid attached to a specific call.
 */
export interface PatientCallNoteContent {
  /** Links back to the row in video_call_sessions. Lives in the content JSON
   *  rather than a notes column so the notes schema is untouched. */
  videoCallSessionId: string;
  callStartedAt: string;
  durationSeconds: number | null;
  mode: 'live' | 'post_call';
  doctorLocale: string;
  patientLocale: string;
  /** False when the clinician overrode an unsupported-language warning. Drives
   *  a permanent unreliability banner wherever the transcript is rendered. */
  languageSupported: boolean;
  /** Pinned so a future engine swap stays auditable. */
  engine: string;
  /** Ring-buffer overflow during capture; non-zero means real gaps. */
  droppedFrames: number;
  segments: TranscriptSegment[];
  /** Clinician's own summary, added on review. */
  summary?: string;
}

export type NoteContent =
  | ProcedureNoteContent
  | SubjectiveNoteContent
  | BlankNoteContent
  | TriageNoteContent
  | PatientCallNoteContent;

/**
 * Note timestamps arrive in three forms: a `Date` from Drizzle on the server,
 * an ISO string over JSON on the web client, and SQLite text from PowerSync on
 * mobile. Read them through `formatDate` (which accepts both) or `new Date(...)`
 * rather than doing string operations on them.
 */
export type NoteTimestamp = Date | string;

export interface NoteBase {
  id: string;
  patientId: string;
  email: string;
  noteType: NoteType;
  date: NoteTimestamp;
  authorName: string | null;
  authorId: string | null;
  attendingPhysicianId: string | null;
  attendingPhysicianName: string | null;
  content: NoteContent | null;
  draft: boolean;
  createdAt: NoteTimestamp;
  updatedAt: NoteTimestamp;
}

/** Response of `GET /api/patient/{id}/notes/doctor-notes`. */
export interface ListNotesResponse {
  /** Published notes and drafts together; split on `draft`. */
  notes: NoteBase[];
}

export type NoteEditType = 'created' | 'updated' | 'published';

export interface NoteEditBase {
  id: string;
  noteId: string;
  editorId: string | null;
  editorName: string | null;
  editorAccountType: string | null;
  editorCareTeamRole: string | null;
  editType: NoteEditType;
  contentSnapshot: NoteContent | null;
  createdAt: NoteTimestamp;
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  procedure: 'Procedure',
  subjective: 'SOAP',
  blank: 'Brief Note',
  triage: 'Triage',
  patient_call: 'Patient Call',
};

/** Header shown on every rendering of a machine transcript, without exception. */
export const MACHINE_TRANSCRIPT_DISCLAIMER =
  'Machine transcript — not reviewed.';

/** Additional warning when the patient's language is not supported. */
export const UNSUPPORTED_LANGUAGE_DISCLAIMER =
  'Transcribed in a language the speech engine does not support. Treat as unreliable.';

// Type guards
export function isProcedureNote(
  note: { noteType: NoteType; content: NoteContent | null },
): note is { noteType: 'procedure'; content: ProcedureNoteContent } & Record<string, any> {
  return note.noteType === 'procedure' && note.content !== null;
}

export function isSubjectiveNote(
  note: { noteType: NoteType; content: NoteContent | null },
): note is { noteType: 'subjective'; content: SubjectiveNoteContent } & Record<string, any> {
  return note.noteType === 'subjective' && note.content !== null;
}

export function isBlankNote(
  note: { noteType: NoteType; content: NoteContent | null },
): note is { noteType: 'blank'; content: BlankNoteContent } & Record<string, any> {
  return note.noteType === 'blank' && note.content !== null;
}

export function isPatientCallNote(
  note: { noteType: NoteType; content: NoteContent | null },
): note is { noteType: 'patient_call'; content: PatientCallNoteContent } & Record<string, any> {
  return note.noteType === 'patient_call' && note.content !== null;
}

/** Formats a segment offset as m:ss for display alongside transcript lines. */
export function formatSegmentTime(startMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(startMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
