import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Save, ClipboardPlus, UserCheck } from 'lucide-react-native';
import { BottomSheet, BottomSheetScrollView, BottomSheetKeyboardSpacer } from '../../BottomSheet';
import { Button } from '../../ui/Button';
import { Tabs, TabsList, TabsTrigger } from '../../ui/Tabs';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing } from '../../../utils/theme';
import { useNoteFormViewModel } from './useNoteFormViewModel';
import { ProcedureNoteForm } from './forms/ProcedureNoteForm';
import { SubjectiveNoteForm } from './forms/SubjectiveNoteForm';
import { BlankNoteForm } from './forms/BlankNoteForm';
import type { Note } from '../../../types/notes';
import type { DictationResult } from './voice-dictation/useVoiceDictation';

interface NoteCreationSheetProps {
  visible: boolean;
  onClose: (savedDraftId?: string) => void;
  patientId: string;
  editNote?: Note;
  /** Field name to auto-focus when editing (e.g. 'procedureName', 'diagnosis') */
  focusField?: string;
  /** Pre-fill procedure fields from voice dictation */
  initialDictationResult?: DictationResult;
}

// --- Isolated auto-save indicator (owns its own state to avoid re-rendering the form tree) ---
interface AutoSaveIndicatorProps {
  visible: boolean;
  hasContent: boolean;
  saveDraftRef: React.MutableRefObject<() => Promise<boolean>>;
  autoSaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  /** Note states that trigger save — passed as a single array for dep tracking */
  noteDeps: [any, any, any, string];
  editNote?: Note;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = React.memo(({
  visible,
  hasContent,
  saveDraftRef,
  autoSaveTimerRef,
  noteDeps,
  editNote,
}) => {
  const colors = useThemeColors();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitializedRef = useRef(false);

  // Mark as initialized after initial population completes
  useEffect(() => {
    if (visible) {
      isInitializedRef.current = false;
      const t = setTimeout(() => { isInitializedRef.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [visible, editNote]);

  // Debounced auto-save draft as user types
  useEffect(() => {
    if (!visible || !isInitializedRef.current || !hasContent) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setStatus('saving');
      const [success] = await Promise.all([
        saveDraftRef.current(),
        new Promise(r => setTimeout(r, 800)),
      ]);
      setStatus(success ? 'saved' : 'idle');
      if (success) setTimeout(() => setStatus('idle'), 2000);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [visible, hasContent, ...noteDeps]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status !== 'saving') return null;

  return (
    <View style={styles.headerSaveIndicator}>
      <Save size={16} color={colors.textSecondary} />
      <ActivityIndicator size="small" color={colors.textSecondary} />
    </View>
  );
});
AutoSaveIndicator.displayName = 'AutoSaveIndicator';

export const NoteCreationSheet: React.FC<NoteCreationSheetProps> = ({
  visible,
  onClose,
  patientId,
  editNote,
  focusField,
  initialDictationResult,
}) => {
  const colors = useThemeColors();
  const vm = useNoteFormViewModel(patientId);
  const scrollViewRef = useRef<any>(null);
  const fieldPositionsRef = useRef<Record<string, number>>({});

  const handleFieldLayout = useCallback((fieldName: string, y: number) => {
    fieldPositionsRef.current[fieldName] = y;
  }, []);

  // Auto-scroll to the focused field after sheet opens + form mounts
  useEffect(() => {
    if (!visible || !focusField) return;
    const t = setTimeout(() => {
      const y = fieldPositionsRef.current[focusField];
      if (y !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y, animated: true });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [visible, focusField]);

  // Pre-fill from voice dictation result
  const appliedDictationRef = useRef(false);
  useEffect(() => {
    if (visible && initialDictationResult && !appliedDictationRef.current) {
      appliedDictationRef.current = true;
      vm.setTemplateType('procedure');
      if (initialDictationResult.procedureName) vm.setNoteField('procedure', 'procedureName', initialDictationResult.procedureName);
      if (initialDictationResult.diagnosis) vm.setNoteField('procedure', 'diagnosis', initialDictationResult.diagnosis);
      if (initialDictationResult.notes) vm.setNoteField('procedure', 'notes', initialDictationResult.notes);
      if (initialDictationResult.plan) vm.setNoteField('procedure', 'plan', initialDictationResult.plan);
    }
    if (!visible) appliedDictationRef.current = false;
  }, [visible, initialDictationResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate: ALL sections must be filled before publishing
  const isFormValid = useMemo(() => {
    switch (vm.templateType) {
      case 'procedure':
        return !!(
          vm.procedureNote.procedureName?.trim() &&
          vm.procedureNote.diagnosis?.trim() &&
          vm.procedureNote.notes?.trim() &&
          vm.procedureNote.plan?.trim()
        );
      case 'subjective':
        return !!(
          vm.subjectiveNote.subjective?.trim() &&
          vm.subjectiveNote.objective?.trim() &&
          vm.subjectiveNote.assessment?.trim() &&
          vm.subjectiveNote.plan?.trim()
        );
      case 'blank':
        return !!vm.blankNote.noteField?.trim();
    }
  }, [vm.templateType, vm.procedureNote, vm.subjectiveNote, vm.blankNote]);

  // Has any content at all (for auto-save — don't save empty forms)
  const hasContent = useMemo(() => {
    switch (vm.templateType) {
      case 'procedure':
        return !!(
          vm.procedureNote.procedureName?.trim() ||
          vm.procedureNote.diagnosis?.trim() ||
          vm.procedureNote.notes?.trim() ||
          vm.procedureNote.plan?.trim()
        );
      case 'subjective':
        return !!(
          vm.subjectiveNote.subjective?.trim() ||
          vm.subjectiveNote.objective?.trim() ||
          vm.subjectiveNote.assessment?.trim() ||
          vm.subjectiveNote.plan?.trim()
        );
      case 'blank':
        return !!vm.blankNote.noteField?.trim();
    }
  }, [vm.templateType, vm.procedureNote, vm.subjectiveNote, vm.blankNote]);

  // Auto-save refs (shared with AutoSaveIndicator, also used by handleCloseWithSave)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDraftRef = useRef(vm.saveDraft);
  saveDraftRef.current = vm.saveDraft;
  const noteDeps = useMemo(
    () => [vm.procedureNote, vm.subjectiveNote, vm.blankNote, vm.templateType] as [any, any, any, string],
    [vm.procedureNote, vm.subjectiveNote, vm.blankNote, vm.templateType],
  );

  // Populate form when editing an existing note
  useEffect(() => {
    if (visible && editNote) {
      vm.populateNote(editNote);
    } else if (visible && !editNote) {
      vm.resetNoteFields();
    }
  }, [visible, editNote]);

  const handleCloseWithSave = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    // skipEditRecord=false → creates ONE edit record for this editing session
    if (hasContent) await vm.saveDraft(false);
    // Pass back the draft ID so NotesView can highlight it
    onClose(vm.editingNoteId || undefined);
  }, [hasContent, vm, onClose]);

  const handlePublish = useCallback(async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const success = await vm.handlePublish();
    if (success) onClose();
  }, [vm, onClose]);

  // --- Stable props for form components (avoid re-render cascade) ---
  const handleProcedureChange = useCallback(
    (name: string, value: string) => vm.setNoteField('procedure', name, value),
    [vm.setNoteField],
  );
  const handleSubjectiveChange = useCallback(
    (name: string, value: string) => vm.setNoteField('subjective', name, value),
    [vm.setNoteField],
  );
  const handleBlankChange = useCallback(
    (name: string, value: string) => vm.setNoteField('blank', name, value),
    [vm.setNoteField],
  );

  // Stable onPublish — uses ref to avoid isFormValid in dependency array
  const isFormValidRef = useRef(isFormValid);
  isFormValidRef.current = isFormValid;
  const handleFormPublish = useCallback(() => {
    if (isFormValidRef.current) handlePublish();
  }, [handlePublish]);

  const title = vm.editingNoteId ? 'Edit Note' : 'New Note';

  const autoSaveAccessory = useMemo(() => (
    <AutoSaveIndicator
      visible={visible}
      hasContent={hasContent}
      saveDraftRef={saveDraftRef}
      autoSaveTimerRef={autoSaveTimerRef}
      noteDeps={noteDeps}
      editNote={editNote}
    />
  ), [visible, hasContent, noteDeps, editNote]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleCloseWithSave}
      title={title}
      titleAccessory={autoSaveAccessory}
      snapPoint={90}
      startExpanded
      showHandle
      showCloseButton
      rawContent
    >
      <View style={styles.keyboardView}>
        {/* Top bar: template chips */}
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Tabs
            value={vm.templateType}
            onValueChange={(v) => vm.setTemplateType(v as 'procedure' | 'subjective' | 'blank')}
            variant="chip"
            style={styles.tabsContainer}
          >
            <TabsList>
              <TabsTrigger value="procedure" label="Procedure" disabled={!!vm.editingNoteId} />
              <TabsTrigger value="subjective" label="SOAP" disabled={!!vm.editingNoteId} />
              <TabsTrigger value="blank" label="Brief Note" disabled={!!vm.editingNoteId} />
            </TabsList>
          </Tabs>
          {/* Attending physician info */}
          <View style={styles.attendingRow}>
            <UserCheck size={14} color={colors.textTertiary} />
            <Text style={[styles.attendingText, { color: colors.textSecondary }]}>
              Attending: {vm.attendingPhysicianName || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Form Content */}
        <BottomSheetScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {vm.templateType === 'procedure' && (
            <ProcedureNoteForm
              note={vm.procedureNote}
              onChange={handleProcedureChange}
              focusField={focusField}
              onFieldLayout={handleFieldLayout}
              onPublish={handleFormPublish}
            />
          )}
          {vm.templateType === 'subjective' && (
            <SubjectiveNoteForm
              note={vm.subjectiveNote}
              onChange={handleSubjectiveChange}
              focusField={focusField}
              onFieldLayout={handleFieldLayout}
              onPublish={handleFormPublish}
            />
          )}
          {vm.templateType === 'blank' && (
            <BlankNoteForm
              note={vm.blankNote}
              onChange={handleBlankChange}
              focusField={focusField}
              onFieldLayout={handleFieldLayout}
              onPublish={handleFormPublish}
            />
          )}

          {/* Publish button — full width, auto-save handles drafting */}
          <View style={styles.actionRow}>
            <Button
              variant="default"
              onPress={handlePublish}
              style={[styles.actionButton, !isFormValid && { opacity: 0.4 }]}
              disabled={!isFormValid || vm.publishing}
              size="sm"
            >
              {vm.publishing ? (
                <ActivityIndicator size={16} color={colors.textInverse} />
              ) : (
                <>
                  <ClipboardPlus size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={[styles.publishButtonText, { color: colors.textInverse }]}>Publish</Text>
                </>
              )}
            </Button>
          </View>
          <BottomSheetKeyboardSpacer />
        </BottomSheetScrollView>

      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  tabsContainer: {
    // Let chips wrap naturally
  },
  attendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  headerSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
