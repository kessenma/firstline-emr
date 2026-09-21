import type {
  NoteType,
  NoteContent,
  ProcedureNoteContent,
  SubjectiveNoteContent,
  BlankNoteContent,
  PatientCallNoteContent,
} from '../patient/note-types';

interface NoteForValidation {
  noteType: NoteType;
  content: NoteContent | null;
}

/** Check if a draft note has all required fields filled for publishing */
export function isNotePublishable(note: NoteForValidation): boolean {
  if (!note.content) return false;

  switch (note.noteType) {
    case 'procedure': {
      const p = note.content as ProcedureNoteContent;
      return !!(p.attendingPhysician?.trim() && p.procedureName?.trim() && p.diagnosis?.trim() && p.notes?.trim() && p.plan?.trim());
    }
    case 'subjective': {
      const s = note.content as SubjectiveNoteContent;
      return !!(s.subjective?.trim() && s.objective?.trim() && s.assessment?.trim() && s.plan?.trim());
    }
    case 'blank': {
      const b = note.content as BlankNoteContent;
      return !!b.noteField?.trim();
    }
    case 'patient_call': {
      // Publishing a call transcript is the clinician attesting they have read
      // it. A transcript with no speech captured has nothing to attest to.
      const c = note.content as PatientCallNoteContent;
      return Array.isArray(c.segments) && c.segments.length > 0;
    }
    default:
      // NOTE: a note type missing from this switch is silently unpublishable
      // forever, with no compile error. 'triage' has been in that state since
      // the schema's first migration. Add a case when adding a type.
      return false;
  }
}

/** Extract a short preview string from a note's content */
export function getNotePreview(note: NoteForValidation): string {
  if (!note.content) return 'No content';
  if (note.noteType === 'procedure') {
    const c = note.content as any;
    return c.procedureName || c.diagnosis || c.notes || 'Procedure note';
  }
  if (note.noteType === 'subjective') {
    const c = note.content as any;
    return c.subjective || c.assessment || c.plan || 'SOAP note';
  }
  if (note.noteType === 'blank') {
    const c = note.content as any;
    return c.noteField || 'Brief note';
  }
  if (note.noteType === 'patient_call') {
    const c = note.content as PatientCallNoteContent;
    const count = Array.isArray(c.segments) ? c.segments.length : 0;
    if (count === 0) return 'Call transcript — no speech captured';
    return `Call transcript · ${count} exchange${count === 1 ? '' : 's'}`;
  }
  return typeof note.content === 'string'
    ? note.content
    : 'Clinical note';
}
