// apps/mobile/src/screens/user-profile/components/LanguagePickerSheet.tsx
// Bottom sheet for selecting languages

import React, { useMemo } from 'react';
import { MultiSelectSheet, MultiSelectOption } from '../../../components/form';
import { LanguagesList } from '../../../data';

interface LanguagePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguages: string[];
  onSelectionChange: (languages: string[]) => void;
}

export const LanguagePickerSheet: React.FC<LanguagePickerSheetProps> = ({
  visible,
  onClose,
  selectedLanguages,
  onSelectionChange,
}) => {
  const options: MultiSelectOption[] = useMemo(
    () =>
      LanguagesList.map(language => ({
        label: language,
        value: language,
      })),
    []
  );

  return (
    <MultiSelectSheet
      visible={visible}
      onClose={onClose}
      title="Select Languages"
      options={options}
      selectedValues={selectedLanguages}
      onSelectionChange={onSelectionChange}
      searchable={true}
      minSelections={1}
      snapPoint={70}
    />
  );
};

export default LanguagePickerSheet;
