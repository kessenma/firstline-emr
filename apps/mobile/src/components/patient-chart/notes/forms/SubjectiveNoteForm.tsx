import React, { useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { TextAreaField } from '../../../form/TextAreaField';
import type { SubjectiveNoteContent } from '../../../../types/notes';

interface SubjectiveNoteFormProps {
  note: SubjectiveNoteContent;
  onChange: (name: keyof SubjectiveNoteContent, value: string) => void;
  focusField?: string;
  onFieldLayout?: (fieldName: string, y: number) => void;
  onPublish?: () => void;
}

export const SubjectiveNoteForm: React.FC<SubjectiveNoteFormProps> = React.memo(({
  note,
  onChange,
  focusField,
  onFieldLayout,
  onPublish,
}) => {
  const subjectiveRef = useRef<TextInput>(null);
  const objectiveRef = useRef<TextInput>(null);
  const assessmentRef = useRef<TextInput>(null);
  const planRef = useRef<TextInput>(null);

  // Stable per-field callbacks (onChange/onPublish are stable from parent)
  const onChangeSubjective = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('subjective', text.slice(0, -1));
      objectiveRef.current?.focus();
      return;
    }
    onChange('subjective', text);
  }, [onChange]);

  const onChangeObjective = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('objective', text.slice(0, -1));
      assessmentRef.current?.focus();
      return;
    }
    onChange('objective', text);
  }, [onChange]);

  const onChangeAssessment = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('assessment', text.slice(0, -1));
      planRef.current?.focus();
      return;
    }
    onChange('assessment', text);
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
      <View onLayout={(e) => onFieldLayout?.('subjective', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={subjectiveRef}
          label="Subjective"
          value={note.subjective}
          onChangeText={onChangeSubjective}
          placeholder="Patient's chief complaint, history of present illness..."
          minHeight={80}
          containerStyle={styles.field}
          autoFocus={focusField === 'subjective'}
        />
      </View>
      <View onLayout={(e) => onFieldLayout?.('objective', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={objectiveRef}
          label="Objective"
          value={note.objective}
          onChangeText={onChangeObjective}
          placeholder="Physical exam findings, vitals, lab results..."
          minHeight={80}
          containerStyle={styles.field}
          autoFocus={focusField === 'objective'}
        />
      </View>
      <View onLayout={(e) => onFieldLayout?.('assessment', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={assessmentRef}
          label="Assessment"
          value={note.assessment}
          onChangeText={onChangeAssessment}
          placeholder="Clinical assessment and diagnosis..."
          minHeight={80}
          containerStyle={styles.field}
          autoFocus={focusField === 'assessment'}
        />
      </View>
      <View onLayout={(e) => onFieldLayout?.('plan', e.nativeEvent.layout.y)}>
        <TextAreaField
          ref={planRef}
          label="Plan"
          value={note.plan}
          onChangeText={onChangePlan}
          placeholder="Treatment plan, follow-up..."
          minHeight={80}
          containerStyle={styles.field}
          autoFocus={focusField === 'plan'}
        />
      </View>
    </View>
  );
});
SubjectiveNoteForm.displayName = 'SubjectiveNoteForm';

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 4,
  },
});
