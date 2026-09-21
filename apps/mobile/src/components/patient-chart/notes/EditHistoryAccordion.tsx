// apps/mobile/src/components/patient-chart/notes/EditHistoryAccordion.tsx
// Lazy-loaded edit history accordion for a single note

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { History, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { useNoteEdits } from '../../../hooks/useNotes';
import type { NoteEdit } from '../../../types/notes';

const EDIT_TYPE_LABELS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  published: 'published',
};

export const EditHistoryAccordion: React.FC<{ noteId: string }> = React.memo(({ noteId }) => {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const { edits } = useNoteEdits(expanded ? noteId : '');

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  // Date | string: note timestamps are SQLite text via PowerSync but a Date
  // when the same record is read server-side. See NoteTimestamp in shared.
  const formatEditDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.editContainer, { borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={styles.editHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.editHeaderLeft}>
          <History size={14} color={colors.textTertiary} />
          <Text style={[styles.editHeaderText, { color: colors.textSecondary }]}>
            Edit History{edits.length > 0 ? ` (${edits.length})` : ''}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={14} color={colors.textTertiary} />
        ) : (
          <ChevronDown size={14} color={colors.textTertiary} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.editList}>
          {edits.length === 0 ? (
            <Text style={[styles.editEmptyText, { color: colors.textTertiary }]}>
              No edit history
            </Text>
          ) : (
            edits.map((edit: NoteEdit, index: number) => (
              <View
                key={edit.id}
                style={[
                  styles.editEntry,
                  index < edits.length - 1 && styles.editEntryBorder,
                  index < edits.length - 1 && { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.editEntryName, { color: colors.text }]}>
                  {edit.editorName || 'Unknown'}
                  {(edit.editorAccountType || edit.editorCareTeamRole) && (
                    <Text style={[styles.editEntryRole, { color: colors.textSecondary }]}>
                      {' '}({[edit.editorAccountType, edit.editorCareTeamRole].filter(Boolean).join(' / ')})
                    </Text>
                  )}
                </Text>
                <Text style={[styles.editEntryMeta, { color: colors.textTertiary }]}>
                  {EDIT_TYPE_LABELS[edit.editType] || edit.editType} · {formatEditDate(edit.createdAt)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
});

EditHistoryAccordion.displayName = 'EditHistoryAccordion';

const styles = StyleSheet.create({
  editContainer: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 4,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  editHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editList: {
    paddingLeft: 20,
    paddingBottom: 4,
  },
  editEmptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  editEntry: {
    paddingVertical: 4,
  },
  editEntryBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editEntryName: {
    fontSize: 12,
    fontWeight: '500',
  },
  editEntryRole: {
    fontSize: 11,
    fontWeight: '400',
  },
  editEntryMeta: {
    fontSize: 11,
  },
});
