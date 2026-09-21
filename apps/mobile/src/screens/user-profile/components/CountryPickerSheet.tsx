// apps/mobile/src/screens/user-profile/components/CountryPickerSheet.tsx
// Bottom sheet for selecting countries

import React, { useMemo } from 'react';
import { MultiSelectSheet, MultiSelectOption } from '../../../components/form';
import { CountriesList } from '../../../data';

interface CountryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedCountries: string[];
  onSelectionChange: (countries: string[]) => void;
}

export const CountryPickerSheet: React.FC<CountryPickerSheetProps> = ({
  visible,
  onClose,
  selectedCountries,
  onSelectionChange,
}) => {
  const options: MultiSelectOption[] = useMemo(
    () =>
      CountriesList.map(country => ({
        label: country,
        value: country,
      })),
    []
  );

  return (
    <MultiSelectSheet
      visible={visible}
      onClose={onClose}
      title="Select Countries"
      options={options}
      selectedValues={selectedCountries}
      onSelectionChange={onSelectionChange}
      searchable={true}
      minSelections={1}
      snapPoint={70}
    />
  );
};

export default CountryPickerSheet;
