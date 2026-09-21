// apps/mobile/src/screens/user-profile/components/SpecialtyPickerSheet.tsx
// Bottom sheet for selecting doctor specialties with availability indicators

import React, { useMemo } from 'react';
import { MultiSelectSheet, MultiSelectOption } from '../../../components/form';
import { DoctorSpecialties } from '../../../data';
import { useAvailableSpecialties } from '../../../hooks/useAvailableSpecialties';

interface SpecialtyPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedSpecialties: string[];
  onSelectionChange: (specialties: string[]) => void;
  /** Show green/red availability dots. Defaults to false for profile picker, true for patient triage. */
  showAvailability?: boolean;
}

export const SpecialtyPickerSheet: React.FC<SpecialtyPickerSheetProps> = ({
  visible,
  onClose,
  selectedSpecialties,
  onSelectionChange,
  showAvailability = false,
}) => {
  const { hasSpecialty } = useAvailableSpecialties();

  const options: MultiSelectOption[] = useMemo(
    () =>
      DoctorSpecialties.map(specialty => ({
        label: specialty,
        value: specialty,
        ...(showAvailability ? { available: hasSpecialty(specialty) } : {}),
      })),
    [showAvailability, hasSpecialty]
  );

  return (
    <MultiSelectSheet
      visible={visible}
      onClose={onClose}
      title="Select Specialties"
      options={options}
      selectedValues={selectedSpecialties}
      onSelectionChange={onSelectionChange}
      searchable={true}
      minSelections={0}
      maxSelections={2}
      snapPoint={70}
      showAvailabilityIndicators={showAvailability}
    />
  );
};

export default SpecialtyPickerSheet;
