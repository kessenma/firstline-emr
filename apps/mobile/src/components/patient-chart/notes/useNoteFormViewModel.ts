import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useNoteMutations } from '../../../hooks/useNotes';
import { useCareTeam } from '../../../hooks/useCareTeamActions';
import type {
  NoteType,
  Note,
  NoteContent,
  ProcedureNoteContent,
  SubjectiveNoteContent,
  BlankNoteContent,
} from '../../../types/notes';

type TemplateType = 'procedure' | 'subjective' | 'blank';

const emptyProcedureNote = (): ProcedureNoteContent => ({
  attendingPhysician: '',
  procedureName: '',
  diagnosis: '',
  cptCodes: [],
  icd10Codes: [],
  notes: '',
  plan: '',
});

const emptySubjectiveNote = (): SubjectiveNoteContent => ({
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  icd10Codes: [],
  cptCodes: [],
});

const emptyBlankNote = (): BlankNoteContent => ({
  noteField: '',
});

export function useNoteFormViewModel(patientId: string) {
  const { user } = useAuth();
  const { createNote, updateNote, publishNote, deleteNote, loading, error } =
    useNoteMutations();
  const { careTeam } = useCareTeam(patientId);

  const [templateType, setTemplateType] = useState<TemplateType>('procedure');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const authorName = user
    ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '')
    : '';
  const authorId = user?._id || user?.id || '';
  const userEmail = user?.email || '';
  const userAccountType = user?.accountType || '';

  // Resolve current user's care team role for this patient
  const currentUserCareTeamRole = useMemo(
    () => careTeam.find(m => m.userId === authorId)?.role || '',
    [careTeam, authorId],
  );

  // Resolve attending physician from care team lead (fallback to current user)
  const leadMember = useMemo(() => careTeam.find(m => m.isLead), [careTeam]);
  const attendingPhysicianId = leadMember?.userId || authorId;
  const attendingPhysicianName = leadMember?.userName || authorName;

  // Form state for each note type
  const [procedureNote, setProcedureNote] = useState<ProcedureNoteContent>(
    () => ({
      ...emptyProcedureNote(),
      attendingPhysician: authorName,
    }),
  );
  const [subjectiveNote, setSubjectiveNote] = useState<SubjectiveNoteContent>(
    emptySubjectiveNote,
  );
  const [blankNote, setBlankNote] = useState<BlankNoteContent>(emptyBlankNote);

  const setNoteField = useCallback(
    (type: TemplateType, name: string, value: string) => {
      switch (type) {
        case 'procedure':
          setProcedureNote(prev => ({ ...prev, [name]: value }));
          break;
        case 'subjective':
          setSubjectiveNote(prev => ({ ...prev, [name]: value }));
          break;
        case 'blank':
          setBlankNote(prev => ({ ...prev, [name]: value }));
          break;
      }
    },
    [],
  );

  const resetNoteFields = useCallback(() => {
    setProcedureNote({
      ...emptyProcedureNote(),
      attendingPhysician: attendingPhysicianName,
    });
    setSubjectiveNote(emptySubjectiveNote());
    setBlankNote(emptyBlankNote());
    setEditingNoteId(null);
  }, [attendingPhysicianName]);

  const getCurrentContent = useCallback((): NoteContent => {
    switch (templateType) {
      case 'procedure':
        return procedureNote;
      case 'subjective':
        return subjectiveNote;
      case 'blank':
        return blankNote;
    }
  }, [templateType, procedureNote, subjectiveNote, blankNote]);

  const populateNote = useCallback(
    (note: Note) => {
      setEditingNoteId(note.id);
      setTemplateType(note.noteType as TemplateType);

      if (!note.content) return;

      switch (note.noteType) {
        case 'procedure':
          setProcedureNote(note.content as ProcedureNoteContent);
          break;
        case 'subjective':
          setSubjectiveNote(note.content as SubjectiveNoteContent);
          break;
        case 'blank':
          setBlankNote(note.content as BlankNoteContent);
          break;
      }
    },
    [],
  );

  const handleCreateNote = useCallback(
    async (draft: boolean) => {
      if (!patientId || !userEmail) {
        Alert.alert('Error', 'Missing patient or user information');
        return;
      }

      const content = getCurrentContent();

      try {
        if (editingNoteId) {
          await updateNote(editingNoteId, {
            content,
            noteType: templateType as NoteType,
            draft,
            editorId: authorId || undefined,
            editorName: authorName || undefined,
            editorAccountType: userAccountType || undefined,
            editorCareTeamRole: currentUserCareTeamRole || undefined,
            skipEditRecord: false,
          });
        } else {
          await createNote({
            patientId,
            noteType: templateType as NoteType,
            content,
            authorId: authorId || undefined,
            authorName: authorName || undefined,
            email: userEmail,
            draft,
            attendingPhysicianId: attendingPhysicianId || undefined,
            attendingPhysicianName: attendingPhysicianName || undefined,
            editorAccountType: userAccountType || undefined,
            editorCareTeamRole: currentUserCareTeamRole || undefined,
          });
        }
        resetNoteFields();
        return true;
      } catch (err) {
        console.error('Failed to save note:', err);
        Alert.alert('Error', 'Failed to save note. Please try again.');
        return false;
      }
    },
    [
      patientId,
      userEmail,
      getCurrentContent,
      editingNoteId,
      templateType,
      authorId,
      authorName,
      userAccountType,
      currentUserCareTeamRole,
      attendingPhysicianId,
      attendingPhysicianName,
      createNote,
      updateNote,
      resetNoteFields,
    ],
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      return new Promise<boolean>(resolve => {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteNote(noteId);
                resolve(true);
              } catch (err) {
                console.error('Failed to delete note:', err);
                Alert.alert('Error', 'Failed to delete note.');
                resolve(false);
              }
            },
          },
        ]);
      });
    },
    [deleteNote],
  );

  const handlePublishNote = useCallback(
    async (noteId: string) => {
      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Publish Note',
          'Are you sure you want to publish this draft?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Publish',
              onPress: async () => {
                try {
                  await publishNote(noteId, authorId || undefined, authorName || undefined, userAccountType || undefined, currentUserCareTeamRole || undefined);
                  resolve(true);
                } catch (err) {
                  console.error('Failed to publish note:', err);
                  Alert.alert('Error', 'Failed to publish note.');
                  resolve(false);
                }
              },
            },
          ],
        );
      });
    },
    [publishNote, authorId, authorName, userAccountType, currentUserCareTeamRole],
  );

  /**
   * Save current form as a draft (create or update). Does NOT reset form.
   * @param skipEditRecord - if true (default), server won't create an edit history entry.
   *   Pass false on session close to record ONE edit per editing session.
   */
  const saveDraft = useCallback(
    async (skipEditRecord: boolean = true) => {
      if (!patientId || !userEmail) return false;
      const content = getCurrentContent();

      try {
        if (editingNoteId) {
          await updateNote(editingNoteId, {
            content,
            noteType: templateType as NoteType,
            draft: true,
            editorId: authorId || undefined,
            editorName: authorName || undefined,
            editorAccountType: userAccountType || undefined,
            editorCareTeamRole: currentUserCareTeamRole || undefined,
            skipEditRecord,
          });
        } else {
          const noteId = await createNote({
            patientId,
            noteType: templateType as NoteType,
            content,
            authorId: authorId || undefined,
            authorName: authorName || undefined,
            email: userEmail,
            draft: true,
            attendingPhysicianId: attendingPhysicianId || undefined,
            attendingPhysicianName: attendingPhysicianName || undefined,
            editorAccountType: userAccountType || undefined,
            editorCareTeamRole: currentUserCareTeamRole || undefined,
          });
          if (noteId) setEditingNoteId(noteId);
        }
        return true;
      } catch (err) {
        console.error('Auto-save failed:', err);
        return false;
      }
    },
    [
      patientId,
      userEmail,
      getCurrentContent,
      editingNoteId,
      templateType,
      authorId,
      authorName,
      userAccountType,
      currentUserCareTeamRole,
      attendingPhysicianId,
      attendingPhysicianName,
      createNote,
      updateNote,
    ],
  );

  /** Publish the current form (save as non-draft). Resets form on success. */
  const handlePublish = useCallback(
    async () => {
      if (!patientId || !userEmail) {
        Alert.alert('Error', 'Missing patient or user information');
        return false;
      }
      const content = getCurrentContent();
      setPublishing(true);

      try {
        if (editingNoteId) {
          await updateNote(editingNoteId, {
            content,
            noteType: templateType as NoteType,
            draft: false,
            editorId: authorId || undefined,
            editorName: authorName || undefined,
            editorAccountType: userAccountType || undefined,
            editorCareTeamRole: currentUserCareTeamRole || undefined,
            skipEditRecord: false,
          });
        } else {
          await createNote({
            patientId,
            noteType: templateType as NoteType,
            content,
            authorId: authorId || undefined,
            authorName: authorName || undefined,
            email: userEmail,
            draft: false,
            attendingPhysicianId: attendingPhysicianId || undefined,
            attendingPhysicianName: attendingPhysicianName || undefined,
            editorAccountType: userAccountType || undefined,
            editorCareTeamRole: currentUserCareTeamRole || undefined,
          });
        }
        resetNoteFields();
        return true;
      } catch (err) {
        console.error('Failed to publish note:', err);
        Alert.alert('Error', 'Failed to publish note. Please try again.');
        return false;
      } finally {
        setPublishing(false);
      }
    },
    [
      patientId,
      userEmail,
      getCurrentContent,
      editingNoteId,
      templateType,
      authorId,
      authorName,
      userAccountType,
      currentUserCareTeamRole,
      attendingPhysicianId,
      attendingPhysicianName,
      createNote,
      updateNote,
      resetNoteFields,
    ],
  );

  return {
    templateType,
    setTemplateType,
    procedureNote,
    subjectiveNote,
    blankNote,
    setNoteField,
    populateNote,
    resetNoteFields,
    handleCreateNote,
    handleDeleteNote,
    handlePublishNote,
    saveDraft,
    handlePublish,
    publishing,
    editingNoteId,
    setEditingNoteId,
    attendingPhysicianName,
    loading,
    error,
  };
}
