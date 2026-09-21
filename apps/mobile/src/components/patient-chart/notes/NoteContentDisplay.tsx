import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import type { Note } from '../../../types/notes';
import {
  isProcedureNote,
  isSubjectiveNote,
  isBlankNote,
  isPatientCallNote,
} from '../../../types/notes';
import { TranscriptView } from '../video-call/components/TranscriptView';

interface NoteContentDisplayProps {
  note: Note;
  /** Called when user taps the pencil icon on a field. Receives the field key name. */
  onEditField?: (fieldName: string) => void;
}

const Field: React.FC<{
  label: string;
  value: string | undefined | null;
  fieldName: string;
  onEdit?: (fieldName: string) => void;
  required?: boolean;
}> = ({ label, value, fieldName, onEdit, required = true }) => {
  const colors = useThemeColors();
  const isEmpty = !value?.trim();

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(fieldName)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.editButton}
          >
            <Pencil size={12} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {isEmpty ? (
        <Text style={[styles.emptyField, { color: colors.textTertiary, backgroundColor: colors.surfaceSecondary }]}>
          {required ? 'Required' : 'Not filled'}
        </Text>
      ) : (
        <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
      )}
    </View>
  );
};

/** Resolve the attending physician name with fallback chain:
 *  1. note.attendingPhysicianName (new column)
 *  2. note.content.attendingPhysician (legacy procedure content field)
 *  3. note.authorName
 */
function getAttendingName(note: Note): string | null {
  if (note.attendingPhysicianName) return note.attendingPhysicianName;
  if (isProcedureNote(note) && note.content?.attendingPhysician) {
    return note.content.attendingPhysician;
  }
  return note.authorName || null;
}

export const NoteContentDisplay: React.FC<NoteContentDisplayProps> = ({
  note,
  onEditField,
}) => {
  const colors = useThemeColors();

  if (!note.content) {
    return (
      <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
        No content available
      </Text>
    );
  }

  const attendingName = getAttendingName(note);

  if (isProcedureNote(note)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Field
          label="Attending Physician"
          value={attendingName}
          fieldName="attendingPhysician"
          required={false}
        />
        <Field
          label="Procedure Name"
          value={note.content.procedureName}
          fieldName="procedureName"
          onEdit={onEditField}
        />
        <Field
          label="Diagnosis"
          value={note.content.diagnosis}
          fieldName="diagnosis"
          onEdit={onEditField}
        />
        <Field
          label="Notes"
          value={note.content.notes}
          fieldName="notes"
          onEdit={onEditField}
        />
        <Field
          label="Plan"
          value={note.content.plan}
          fieldName="plan"
          onEdit={onEditField}
        />
      </View>
    );
  }

  if (isSubjectiveNote(note)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Field
          label="Attending Physician"
          value={attendingName}
          fieldName="attendingPhysician"
          required={false}
        />
        <Field
          label="Subjective"
          value={note.content.subjective}
          fieldName="subjective"
          onEdit={onEditField}
        />
        <Field
          label="Objective"
          value={note.content.objective}
          fieldName="objective"
          onEdit={onEditField}
        />
        <Field
          label="Assessment"
          value={note.content.assessment}
          fieldName="assessment"
          onEdit={onEditField}
        />
        <Field
          label="Plan"
          value={note.content.plan}
          fieldName="plan"
          onEdit={onEditField}
        />
      </View>
    );
  }

  if (isBlankNote(note)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Field
          label="Attending Physician"
          value={attendingName}
          fieldName="attendingPhysician"
          required={false}
        />
        <Field
          label="Note"
          value={note.content.noteField}
          fieldName="noteField"
          onEdit={onEditField}
        />
      </View>
    );
  }

  if (isPatientCallNote(note)) {
    // Machine-authored, so no per-field edit affordances — the clinician edits
    // it as a whole or promotes it into a note of their own.
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <TranscriptView content={note.content} />
      </View>
    );
  }

  // Fallback for unknown note types
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.fieldValue, { color: colors.text }]}>
        {typeof note.content === 'string'
          ? note.content
          : JSON.stringify(note.content, null, 2)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  fieldContainer: {
    gap: 2,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 4,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyField: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
});
