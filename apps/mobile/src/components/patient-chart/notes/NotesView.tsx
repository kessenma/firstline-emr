// apps/mobile/src/components/patient-chart/notes/NotesView.tsx
// Notes section for patient chart - matches web CombinedNotesView

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import {
  FileText,
  Plus,
  Mic,
  ChevronDown,
  ChevronUp,
  NotebookPen,
} from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { usePatientChart } from '../PatientChartContext';
import { useNoteFormViewModel } from './useNoteFormViewModel';
import { useNoteMutations } from '../../../hooks/useNotes';
import { NoteContentDisplay } from './NoteContentDisplay';
import { NoteCreationSheet } from './NoteCreationSheet';
import { NoteContributors } from './NoteContributors';
import { EditHistoryAccordion } from './EditHistoryAccordion';
import { DraftedNoteCard } from './DraftedNoteCard';
import { VoiceDictationSheet } from './voice-dictation/VoiceDictationSheet';
import { FeatureFlags } from '../../../config/featureFlags';
import { NOTE_TYPE_LABELS, formatDate, getNotePreview } from './noteUtils';
import type { Note } from '../../../types/notes';
import type { DictationResult } from './voice-dictation/useVoiceDictation';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Wraps a card with a pulsing border opacity animation (success color). */
const HighlightPulseWrapper: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[style, { opacity: pulseAnim.interpolate({
      inputRange: [0.3, 1],
      outputRange: [0.7, 1],
    }) }]}>
      {children}
    </Animated.View>
  );
};

export const NotesView: React.FC = () => {
  const colors = useThemeColors();
  const {
    notes,
    draftNotes,
    loadingNotes,
    notesError,
    refreshNotes,
    patientInfo,
  } = usePatientChart();

  const dashboardNotes = patientInfo?.dashboardNotes;

  const patientId = patientInfo?.id || '';
  const { handleDeleteNote, handlePublishNote } =
    useNoteFormViewModel(patientId);
  const { user } = useAuth();
  const { createNote, updateNote } = useNoteMutations();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'published' | 'drafts'>(
    'published',
  );
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Auto-expand all draft notes
  useEffect(() => {
    if (draftNotes.length > 0) {
      setExpandedNotes(prev => {
        const next = new Set(prev);
        draftNotes.forEach(note => next.add(note.id));
        return next;
      });
    }
  }, [draftNotes]);

  const [showNoteCreation, setShowNoteCreation] = useState(false);
  const [showVoiceDictation, setShowVoiceDictation] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [focusField, setFocusField] = useState<string | undefined>();
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  const flashListRef = useRef<FlashListRef<Note>>(null);

  // When a note is highlighted, scroll to it and clear after 3s
  useEffect(() => {
    if (!highlightNoteId) return;

    const list = selectedTab === 'published' ? notes : draftNotes;
    const idx = list.findIndex(n => n.id === highlightNoteId);
    if (idx >= 0 && flashListRef.current) {
      setTimeout(() => {
        flashListRef.current?.scrollToIndex({ index: idx, animated: true });
      }, 300);
    }

    const t = setTimeout(() => setHighlightNoteId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightNoteId, selectedTab, notes, draftNotes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotes();
    setRefreshing(false);
  };

  const toggleExpanded = useCallback((noteId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  const handleEdit = useCallback((note: Note) => {
    setEditingNote(note);
    setFocusField(undefined);
    setShowNoteCreation(true);
  }, []);

  const handleEditField = useCallback((note: Note, fieldName: string) => {
    setEditingNote(note);
    setFocusField(fieldName);
    setShowNoteCreation(true);
  }, []);

  const handleAddNote = useCallback(() => {
    setEditingNote(undefined);
    setFocusField(undefined);
    setShowNoteCreation(true);
  }, []);

  const handleVoiceDictationResult = useCallback((fields: DictationResult) => {
    // Open the note creation sheet pre-filled with dictation results
    setEditingNote(undefined);
    setFocusField(undefined);
    setShowVoiceDictation(false);
    setShowNoteCreation(true);
    // Store fields to pass to the creation sheet
    pendingDictationRef.current = fields;
  }, []);

  const handleVoiceSaveDraft = useCallback(async (fields: DictationResult) => {
    if (!patientId || !user?.email) return;
    const authorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const authorId = user._id || user.id || '';
    try {
      const content = {
        attendingPhysician: authorName,
        procedureName: fields.procedureName || '',
        diagnosis: fields.diagnosis || '',
        cptCodes: [],
        icd10Codes: [],
        notes: fields.notes || '',
        plan: fields.plan || '',
      };
      const noteId = await createNote({
        patientId,
        noteType: 'procedure',
        content,
        authorId,
        authorName,
        email: user.email,
        draft: true,
      });
      setShowVoiceDictation(false);
      if (noteId) {
        setSelectedTab('drafts');
        setHighlightNoteId(noteId);
      }
    } catch (err) {
      console.error('[NotesView] voice save draft failed:', err);
    }
  }, [patientId, user, createNote]);

  // Direct publish from voice dictation (no NoteCreationSheet intermediate step)
  const handleVoicePublish = useCallback(async (fields: DictationResult) => {
    if (!patientId || !user?.email) return;
    const authorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const authorId = user._id || user.id || '';
    try {
      const content = {
        attendingPhysician: authorName,
        procedureName: fields.procedureName || '',
        diagnosis: fields.diagnosis || '',
        cptCodes: [],
        icd10Codes: [],
        notes: fields.notes || '',
        plan: fields.plan || '',
      };
      const noteId = await createNote({
        patientId,
        noteType: 'procedure',
        content,
        authorId,
        authorName,
        email: user.email,
        draft: false,
      });
      setShowVoiceDictation(false);
      setSelectedTab('published');
      if (noteId) setHighlightNoteId(noteId);
    } catch (err) {
      console.error('[NotesView] voice publish failed:', err);
    }
  }, [patientId, user, createNote]);

  // Direct publish from voice dictation when editing an existing draft — publish the draft
  const handleDraftVoicePublish = useCallback(async (fields: DictationResult) => {
    const draft = voiceDictateNoteRef.current;
    if (!draft) {
      await handleVoicePublish(fields);
      return;
    }
    const existing = (draft.content ?? {}) as Record<string, any>;
    const mergedContent = { ...existing };
    for (const key of ['procedureName', 'diagnosis', 'notes', 'plan'] as const) {
      const prev = (existing[key] || '').trim();
      const next = (fields[key] || '').trim();
      if (prev && next) mergedContent[key] = `${prev} ${next}`;
      else if (next) mergedContent[key] = next;
    }
    try {
      const authorId = user?._id || user?.id || '';
      const authorName = user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '') : '';
      await updateNote(draft.id, {
        content: mergedContent as any,
        draft: false,
        editorId: authorId,
        editorName: authorName,
      });
      setShowVoiceDictation(false);
      setSelectedTab('published');
      setHighlightNoteId(draft.id);
    } catch (err) {
      console.error('[NotesView] voice draft publish failed:', err);
    }
    voiceDictateNoteRef.current = null;
  }, [handleVoicePublish, user, updateNote]);

  const pendingDictationRef = useRef<DictationResult | null>(null);
  const voiceDictateNoteRef = useRef<Note | null>(null);

  // Open voice dictation for an existing draft note
  const handleVoiceDictateForDraft = useCallback((note: Note) => {
    voiceDictateNoteRef.current = note;
    setShowVoiceDictation(true);
  }, []);

  // "Fill Note" from voice dictation when editing an existing draft — merge into draft & open editor
  const handleDraftVoiceFillNote = useCallback((fields: DictationResult) => {
    const draft = voiceDictateNoteRef.current;
    if (!draft) {
      // No draft context — fall back to new note flow
      handleVoiceDictationResult(fields);
      return;
    }
    // Merge: append dictated text to existing content
    const existing = (draft.content ?? {}) as Record<string, any>;
    const merged: DictationResult = {};
    for (const key of ['procedureName', 'diagnosis', 'notes', 'plan'] as const) {
      const prev = (existing[key] || '').trim();
      const next = (fields[key] || '').trim();
      if (prev && next) merged[key] = `${prev} ${next}`;
      else if (next) merged[key] = next;
      else if (prev) merged[key] = prev;
    }
    // Open NoteCreationSheet with the draft + merged dictation
    setEditingNote(draft);
    setFocusField(undefined);
    setShowVoiceDictation(false);
    pendingDictationRef.current = merged;
    setShowNoteCreation(true);
    voiceDictateNoteRef.current = null;
  }, [handleVoiceDictationResult]);

  // "Save Draft" from voice dictation when editing an existing draft — update directly
  const handleDraftVoiceSaveDraft = useCallback(async (fields: DictationResult) => {
    const draft = voiceDictateNoteRef.current;
    if (!draft) {
      // No draft context — fall back to new draft flow
      await handleVoiceSaveDraft(fields);
      return;
    }
    const existing = (draft.content ?? {}) as Record<string, any>;
    const mergedContent = { ...existing };
    for (const key of ['procedureName', 'diagnosis', 'notes', 'plan'] as const) {
      const prev = (existing[key] || '').trim();
      const next = (fields[key] || '').trim();
      if (prev && next) mergedContent[key] = `${prev} ${next}`;
      else if (next) mergedContent[key] = next;
    }
    try {
      const authorId = user?._id || user?.id || '';
      const authorName = user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '') : '';
      await updateNote(draft.id, {
        content: mergedContent as any,
        editorId: authorId,
        editorName: authorName,
      });
      setShowVoiceDictation(false);
      setHighlightNoteId(draft.id);
    } catch (err) {
      console.error('[NotesView] voice update draft failed:', err);
    }
    voiceDictateNoteRef.current = null;
  }, [handleVoiceSaveDraft, user, updateNote]);

  const renderNote = ({ item }: { item: Note }) => {
    const isExpanded = expandedNotes.has(item.id);
    const isHighlighted = item.id === highlightNoteId;

    // Draft notes use dedicated DraftedNoteCard
    if (item.draft) {
      const card = (
        <DraftedNoteCard
          note={item}
          isExpanded={isExpanded}
          isHighlighted={isHighlighted}
          onToggleExpand={toggleExpanded}
          onEdit={handleEdit}
          onEditField={handleEditField}
          onPublish={handlePublishNote}
          onDelete={handleDeleteNote}
          onVoiceDictate={handleVoiceDictateForDraft}
        />
      );
      return isHighlighted ? <HighlightPulseWrapper>{card}</HighlightPulseWrapper> : card;
    }

    // Published notes — read-only with contributors
    const typeLabel = NOTE_TYPE_LABELS[item.noteType] || item.noteType;
    const CardWrapper = isHighlighted ? HighlightPulseWrapper : View;

    return (
      <CardWrapper
        style={[
          styles.noteCard,
          { backgroundColor: colors.surface },
          isHighlighted && { borderWidth: 2, borderColor: colors.success },
        ]}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.noteHeader}
          onPress={() => toggleExpanded(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.noteHeaderLeft}>
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.noteType, { color: colors.text }]}>
              {typeLabel}
            </Text>
          </View>
          <View style={styles.noteHeaderRight}>
            {isExpanded ? (
              <ChevronUp size={18} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Preview (collapsed) */}
        {!isExpanded && (
          <Text
            style={[styles.notePreview, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {getNotePreview(item)}
          </Text>
        )}

        {/* Full content (expanded) — read-only for published */}
        {isExpanded && <NoteContentDisplay note={item} />}

        {/* Footer */}
        <View style={[styles.noteFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
            {formatDate(item.date || item.createdAt)}
          </Text>
          {item.authorName && (
            <Text style={[styles.noteAuthor, { color: colors.textSecondary }]}>
              by {item.authorName}
            </Text>
          )}
        </View>

        {/* Contributors */}
        <NoteContributors noteId={item.id} />

        {/* Edit History accordion */}
        <EditHistoryAccordion noteId={item.id} />
      </CardWrapper>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        {selectedTab === 'published' ? 'No published notes' : 'No draft notes'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {selectedTab === 'published'
          ? 'Tap "Add Note" to create a clinical note'
          : 'Save notes as drafts to review them later'}
      </Text>
    </View>
  );

  if (notesError) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {notesError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {}}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayNotes = selectedTab === 'published' ? notes : draftNotes;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Clinical Notes
        </Text>
        <View style={styles.headerActions}>
          {FeatureFlags.VOICE_DICTATION && (
            <TouchableOpacity
              style={[styles.micButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowVoiceDictation(true)}
            >
              <Mic size={18} color={colors.textInverse} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddNote}
          >
            <Plus size={18} color={colors.textInverse} />
            <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor:
                selectedTab === 'published'
                  ? colors.primary
                  : colors.surfaceSecondary,
            },
          ]}
          onPress={() => setSelectedTab('published')}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color:
                  selectedTab === 'published'
                    ? colors.white
                    : colors.textSecondary,
              },
            ]}
          >
            Published ({notes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor:
                selectedTab === 'drafts'
                  ? colors.primary
                  : colors.surfaceSecondary,
            },
          ]}
          onPress={() => setSelectedTab('drafts')}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color:
                  selectedTab === 'drafts'
                    ? colors.white
                    : colors.textSecondary,
              },
            ]}
          >
            Drafts ({draftNotes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Triage Dashboard Notes (read-only) */}
      {dashboardNotes?.trim() ? (
        <View style={[styles.triageCard, { backgroundColor: colors.surface }]}>
          <View style={styles.triageHeader}>
            <NotebookPen size={16} color={colors.warning} />
            <Text style={[styles.triageLabel, { color: colors.warning }]}>
              Triage Notes
            </Text>
          </View>
          <Text style={[styles.triageText, { color: colors.text }]}>
            {dashboardNotes}
          </Text>
        </View>
      ) : null}

      {/* Notes List */}
      {loadingNotes ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading notes...
          </Text>
        </View>
      ) : (
        <FlashList
          ref={flashListRef}
          data={displayNotes}
          extraData={highlightNoteId}
          keyExtractor={item => item.id}
          renderItem={renderNote}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Note Creation Sheet — only mount when needed to avoid nested BottomSheetModal conflicts */}
      {showNoteCreation && (
        <NoteCreationSheet
          visible={showNoteCreation}
          onClose={(savedDraftId?: string) => {
            setShowNoteCreation(false);
            setEditingNote(undefined);
            setFocusField(undefined);
            pendingDictationRef.current = null;
            if (savedDraftId) {
              setSelectedTab('drafts');
              setHighlightNoteId(savedDraftId);
            }
          }}
          patientId={patientId}
          editNote={editingNote}
          focusField={focusField}
          initialDictationResult={pendingDictationRef.current ?? undefined}
        />
      )}

      {/* Voice Dictation Sheet */}
      {showVoiceDictation && (
        <VoiceDictationSheet
          visible={showVoiceDictation}
          onClose={() => {
            setShowVoiceDictation(false);
            voiceDictateNoteRef.current = null;
          }}
          onFieldsReady={voiceDictateNoteRef.current ? handleDraftVoiceFillNote : handleVoiceDictationResult}
          onSaveDraft={voiceDictateNoteRef.current ? handleDraftVoiceSaveDraft : handleVoiceSaveDraft}
          onPublish={voiceDictateNoteRef.current ? handleDraftVoicePublish : handleVoicePublish}
          initialContent={voiceDictateNoteRef.current ? (() => {
            const c = (voiceDictateNoteRef.current!.content ?? {}) as Record<string, any>;
            const result: DictationResult = {};
            if (c.procedureName) result.procedureName = c.procedureName;
            if (c.diagnosis) result.diagnosis = c.diagnosis;
            if (c.notes) result.notes = c.notes;
            if (c.plan) result.plan = c.plan;
            return result;
          })() : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micButton: {
    padding: 8,
    borderRadius: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteType: {
    fontSize: 16,
    fontWeight: '600',
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
  },
  noteAuthor: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  triageCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  triageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  triageLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  triageText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
