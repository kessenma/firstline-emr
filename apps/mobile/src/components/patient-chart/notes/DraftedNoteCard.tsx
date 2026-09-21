// apps/mobile/src/components/patient-chart/notes/DraftedNoteCard.tsx
// Dedicated card component for draft notes with Edit/Publish/Delete actions

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FilePlus2, Edit2, Trash2, Send, Mic, ChevronDown, ChevronUp } from 'lucide-react-native';
import { FeatureFlags } from '../../../config/featureFlags';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { NoteContentDisplay } from './NoteContentDisplay';
import { EditHistoryAccordion } from './EditHistoryAccordion';
import { NOTE_TYPE_LABELS, isNotePublishable, formatDate, getNotePreview } from './noteUtils';
import type { Note } from '../../../types/notes';

interface DraftedNoteCardProps {
  note: Note;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggleExpand: (noteId: string) => void;
  onEdit: (note: Note) => void;
  onEditField: (note: Note, fieldName: string) => void;
  onPublish: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onVoiceDictate?: (note: Note) => void;
}

export const DraftedNoteCard: React.FC<DraftedNoteCardProps> = React.memo(({
  note,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onEdit,
  onEditField,
  onPublish,
  onDelete,
  onVoiceDictate,
}) => {
  const colors = useThemeColors();
  const typeLabel = NOTE_TYPE_LABELS[note.noteType] || note.noteType;

  return (
    <View
      style={[
        styles.noteCard,
        { backgroundColor: colors.surface },
        isHighlighted && { borderWidth: 2, borderColor: colors.success },
      ]}
    >
      {/* Header with type + DRAFT badge + expand toggle */}
      <TouchableOpacity
        style={styles.noteHeader}
        onPress={() => onToggleExpand(note.id)}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeaderLeft}>
          <FilePlus2 size={18} color={colors.primary} />
          <Text style={[styles.noteType, { color: colors.text }]}>
            {typeLabel}
          </Text>
        </View>
        <View style={styles.noteHeaderRight}>
          <View style={[styles.draftBadge, { backgroundColor: colors.warning + '30' }]}>
            <Text style={[styles.draftBadgeText, { color: colors.warning }]}>
              DRAFT
            </Text>
          </View>
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
          {getNotePreview(note)}
        </Text>
      )}

      {/* Full content (expanded) — fields are editable */}
      {isExpanded && (
        <NoteContentDisplay
          note={note}
          onEditField={(fieldName) => onEditField(note, fieldName)}
        />
      )}

      {/* Footer */}
      <View style={[styles.noteFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
          {formatDate(note.date || note.createdAt)}
        </Text>
        {note.authorName && (
          <Text style={[styles.noteAuthor, { color: colors.textSecondary }]}>
            by {note.authorName}
          </Text>
        )}
      </View>

      {/* Edit History accordion */}
      <EditHistoryAccordion noteId={note.id} />

      {/* Action chips */}
      <View style={styles.noteActions}>
        {FeatureFlags.VOICE_DICTATION && onVoiceDictate && (
          <TouchableOpacity
            style={[styles.actionChip, { borderColor: colors.primary }]}
            onPress={() => onVoiceDictate(note)}
          >
            <Mic size={13} color={colors.primary} />
            <Text style={[styles.actionChipText, { color: colors.primary }]}>Dictate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionChip, { borderColor: colors.primary }]}
          onPress={() => onEdit(note)}
        >
          <Edit2 size={13} color={colors.primary} />
          <Text style={[styles.actionChipText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>

        {isNotePublishable(note) && (
          <TouchableOpacity
            style={[styles.actionChip, { borderColor: colors.success }]}
            onPress={() => onPublish(note.id)}
          >
            <Send size={13} color={colors.success} />
            <Text style={[styles.actionChipText, { color: colors.success }]}>Publish</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionChip, { borderColor: colors.error }]}
          onPress={() => onDelete(note.id)}
        >
          <Trash2 size={13} color={colors.error} />
          <Text style={[styles.actionChipText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

DraftedNoteCard.displayName = 'DraftedNoteCard';

const styles = StyleSheet.create({
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
  draftBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
