// Re-export shared note types
export type {
  NoteType,
  ProcedureNoteContent,
  SubjectiveNoteContent,
  BlankNoteContent,
  TriageNoteContent,
  PatientCallNoteContent,
  TranscriptSegment,
  TranscriptSpeaker,
  NoteContent,
  NoteEditType,
} from '@fajr/shared/patient';
export {
  isProcedureNote,
  isSubjectiveNote,
  isBlankNote,
  isPatientCallNote,
  formatSegmentTime,
  NOTE_TYPE_LABELS,
  MACHINE_TRANSCRIPT_DISCLAIMER,
  UNSUPPORTED_LANGUAGE_DISCLAIMER,
} from '@fajr/shared/patient';

// Mobile-specific Note interface (matches NoteBase but keeps backward compat)
import type { NoteBase, NoteEditBase } from '@fajr/shared/patient';

export type Note = NoteBase;
export type NoteEdit = NoteEditBase;
