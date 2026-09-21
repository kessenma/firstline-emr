import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextAreaField } from '../../../form/TextAreaField';
import type { BlankNoteContent } from '../../../../types/notes';

interface BlankNoteFormProps {
  note: BlankNoteContent;
  onChange: (name: keyof BlankNoteContent, value: string) => void;
  focusField?: string;
  onFieldLayout?: (fieldName: string, y: number) => void;
  onPublish?: () => void;
}

export const BlankNoteForm: React.FC<BlankNoteFormProps> = React.memo(({
  note,
  onChange,
  focusField,
  onFieldLayout,
  onPublish,
}) => {
  const onChangeNoteField = useCallback((text: string) => {
    if (text.endsWith('\t')) {
      onChange('noteField', text.slice(0, -1));
      onPublish?.();
      return;
    }
    onChange('noteField', text);
  }, [onChange, onPublish]);

  return (
    <View style={styles.container}>
      <View onLayout={(e) => onFieldLayout?.('noteField', e.nativeEvent.layout.y)}>
        <TextAreaField
          label="Note"
          value={note.noteField}
          onChangeText={onChangeNoteField}
          placeholder="Enter your note..."
          minHeight={200}
          containerStyle={styles.field}
          autoFocus={focusField === 'noteField'}
        />
      </View>
    </View>
  );
});
BlankNoteForm.displayName = 'BlankNoteForm';

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 4,
  },
});
