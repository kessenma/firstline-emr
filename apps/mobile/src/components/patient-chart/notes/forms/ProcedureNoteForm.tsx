import React, { useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { TextInputField } from '../../../form/TextInputField';
import { TextAreaField } from '../../../form/TextAreaField';
import { Tooltip } from '../../../ui/Tooltip';
import type { ProcedureNoteContent } from '../../../../types/notes';

interface ProcedureNoteFormProps {
  note: ProcedureNoteContent;
  onChange: (name: keyof ProcedureNoteContent, value: string) => void;
  focusField?: string;
  /** Reports field Y offset (relative to form container) for auto-scroll */
  onFieldLayout?: (fieldName: string, y: number) => void;
  /** Called when user Tabs past the last field — triggers publish */
  onPublish?: () => void;
}

export const ProcedureNoteForm: React.FC<ProcedureNoteFormProps> = React.memo(({
  note,
  onChange,
  focusField,
  onFieldLayout,
  onPublish,
}) => {
  const procedureNameRef = useRef<TextInput>(null);
  const diagnosisRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const planRef = useRef<TextInput>(null);

  // Stable per-field callbacks (onChange/onPublish are stable from parent)
  const onChangeProcedureName = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('procedureName', text.slice(0, -1));
      diagnosisRef.current?.focus();
      return;
    }
    onChange('procedureName', text);
  }, [onChange]);

  const onChangeDiagnosis = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('diagnosis', text.slice(0, -1));
      notesRef.current?.focus();
      return;
    }
    onChange('diagnosis', text);
  }, [onChange]);

  const onChangeNotes = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('notes', text.slice(0, -1));
      planRef.current?.focus();
      return;
    }
    onChange('notes', text);
  }, [onChange]);

  const onChangePlan = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('plan', text.slice(0, -1));
      onPublish?.();
      return;
    }
    onChange('plan', text);
  }, [onChange, onPublish]);

  return (
    <View style={styles.container}>
      {/* Read-only: resolved from care team lead surgeon */}
      <Tooltip
        tooltipText="Auto-filled from the care team's lead surgeon"
        position="bottom"
        maxWidth={240}
      >
        <TextInputField
          label="Attending Physician"
          value={note.attendingPhysician}
          placeholder="Not set"
          containerStyle={styles.field}
          readOnly
          rightIcon={<Lock size={14} color="#999" />}
        />
      </Tooltip>
      <View onLayout={(e) => onFieldLayout?.('procedureName', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={procedureNameRef}
          label="Procedure Name"
          value={note.procedureName}
          onChangeText={onChangeProcedureName}
          placeholder="Enter procedure name"
          minHeight={60}
          containerStyle={styles.field}
          autoFocus={focusField === 'procedureName'}
        />
      </View>
      <View onLayout={(e) => onFieldLayout?.('diagnosis', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={diagnosisRef}
          label="Diagnosis"
          value={note.diagnosis}
          onChangeText={onChangeDiagnosis}
          placeholder="Enter diagnosis"
          minHeight={60}
          containerStyle={styles.field}
          autoFocus={focusField === 'diagnosis'}
        />
      </View>
      <View onLayout={(e) => onFieldLayout?.('notes', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={notesRef}
          label="Notes"
          value={note.notes}
          onChangeText={onChangeNotes}
          placeholder="Enter clinical notes"
          minHeight={80}
          containerStyle={styles.field}
          autoFocus={focusField === 'notes'}
        />
      </View>
      <View onLayout={(e) => onFieldLayout?.('plan', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={planRef}
          label="Plan"
          value={note.plan}
          onChangeText={onChangePlan}
          placeholder="Enter treatment plan"
          minHeight={80}
          containerStyle={styles.field}
          autoFocus={focusField === 'plan'}
        />
      </View>
    </View>
  );
});
ProcedureNoteForm.displayName = 'ProcedureNoteForm';

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 4,
  },
});
