import type { ProcedureNoteContent, SubjectiveNoteContent, BlankNoteContent } from '../patient/note-types';

export const emptyProcedureNote = (): ProcedureNoteContent => ({
  attendingPhysician: '',
  procedureName: '',
  diagnosis: '',
  cptCodes: [],
  icd10Codes: [],
  notes: '',
  plan: '',
});

export const emptySubjectiveNote = (): SubjectiveNoteContent => ({
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  icd10Codes: [],
  cptCodes: [],
});

export const emptyBlankNote = (): BlankNoteContent => ({
  noteField: '',
});
