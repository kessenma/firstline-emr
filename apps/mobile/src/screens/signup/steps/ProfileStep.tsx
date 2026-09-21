import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { useSignupContext } from '../SignupContext';
import { DoctorSpecialties } from '../../../data/doctorSpecialty';
import { LanguagesList } from '../../../data/languages';
import { CountriesList } from '../../../data/countries';
import { palette } from '../../../utils/colors';

// Inline date picker for DOB
const DateInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  return (
    <View>
      <Text style={styles.label}>Date of Birth</Text>
      <TextInput
        style={styles.input}
        placeholder="MM/DD/YYYY"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={value}
        onChangeText={(text) => {
          // Auto-format as user types
          const cleaned = text.replace(/\D/g, '');
          let formatted = cleaned;
          if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
          }
          if (cleaned.length > 4) {
            formatted =
              cleaned.slice(0, 2) +
              '/' +
              cleaned.slice(2, 4) +
              '/' +
              cleaned.slice(4, 8);
          }
          onChange(formatted);
        }}
        keyboardType="number-pad"
        maxLength={10}
      />
    </View>
  );
};

// Multi-select picker modal
const MultiSelectPicker: React.FC<{
  label: string;
  placeholder?: string;
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  maxSelections?: number;
}> = ({ label, placeholder = 'Select', options, value, onChange, maxSelections }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const sheetRef = useRef<BottomSheetModal>(null);
  const hasPresented = useRef(false);
  const snapPoints = useMemo(() => ['70%'], []);

  useEffect(() => {
    if (isOpen) {
      hasPresented.current = true;
      sheetRef.current?.present();
      return;
    }

    if (hasPresented.current) {
      sheetRef.current?.dismiss();
    }
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, item]);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerButtonText,
            value.length === 0 && { color: 'rgba(255,255,255,0.3)' },
          ]}
          numberOfLines={1}
        >
          {value.length > 0 ? `${value.length} selected` : placeholder}
        </Text>
        <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
      {value.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
          {value.map((v) => (
            <View key={v} style={styles.tag}>
              <Text style={styles.tagText}>{v}</Text>
              <TouchableOpacity onPress={() => toggle(v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={12} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        onDismiss={handleDismiss}
        enablePanDownToClose
        backdropComponent={() => null}
        backgroundStyle={styles.modalContent}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{label}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsOpen(false);
              setSearch('');
            }}
          >
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
        </View>
        {options.length > 8 && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}
        {maxSelections && (
          <Text style={styles.maxNote}>Max {maxSelections} selections</Text>
        )}
        <BottomSheetFlatList<string>
          data={filtered}
          keyExtractor={(item: string) => item}
          renderItem={({ item }: { item: string }) => {
            const isSelected = value.includes(item);
            const isDisabled =
              !isSelected && !!maxSelections && value.length >= maxSelections;
            return (
              <TouchableOpacity
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => toggle(item)}
                disabled={isDisabled}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    isDisabled && { opacity: 0.4 },
                  ]}
                >
                  {item}
                </Text>
                {isSelected && <Check size={18} color={palette.teal[500]} />}
              </TouchableOpacity>
            );
          }}
        />
      </BottomSheetModal>
    </View>
  );
};

// Single select for gender
const GenderSelector: React.FC<{
  value: 'Male' | 'Female' | null;
  onChange: (val: 'Male' | 'Female') => void;
}> = ({ value, onChange }) => {
  return (
    <View>
      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {(['Male', 'Female'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderButton,
              value === g && styles.genderButtonSelected,
            ]}
            onPress={() => onChange(g)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.genderText,
                value === g && styles.genderTextSelected,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export const ProfileStep: React.FC = () => {
  const { formData, updateFormData } = useSignupContext();
  const isDoctor = formData.accountType === 'Doctor';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isDoctor ? 'Doctor Profile' : 'Triage Profile'}
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={formData.firstName}
          onChangeText={(text) => updateFormData({ firstName: text })}
          autoComplete="given-name"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={formData.lastName}
          onChangeText={(text) => updateFormData({ lastName: text })}
          autoComplete="family-name"
        />
      </View>

      <View style={styles.fieldGroup}>
        <DateInput
          value={formData.dob}
          onChange={(val) => updateFormData({ dob: val })}
        />
      </View>

      <View style={styles.fieldGroup}>
        <MultiSelectPicker
          label="Languages"
          placeholder="Select languages"
          options={LanguagesList}
          value={formData.languages}
          onChange={(val) => updateFormData({ languages: val })}
        />
      </View>

      <View style={styles.fieldGroup}>
        <MultiSelectPicker
          label="Countries"
          placeholder="Select countries"
          options={CountriesList}
          value={formData.countries}
          onChange={(val) => updateFormData({ countries: val })}
        />
      </View>

      {isDoctor && (
        <>
          <View style={styles.fieldGroup}>
            <MultiSelectPicker
              label="Doctor Specialty (max 2)"
              placeholder="Select specialties"
              options={DoctorSpecialties}
              value={formData.doctorSpecialty}
              onChange={(val) =>
                updateFormData({
                  doctorSpecialty: val,
                  medicalLicenses: formData.medicalLicenses.filter((license) =>
                    val.includes(license.specialty),
                  ),
                })
              }
              maxSelections={2}
            />
          </View>

          <View style={styles.fieldGroup}>
            <GenderSelector
              value={formData.gender}
              onChange={(val) => updateFormData({ gender: val })}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
  pickerButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(53,157,152,0.2)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: palette.teal[300],
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonSelected: {
    borderColor: palette.teal[500],
    backgroundColor: 'rgba(53,157,152,0.15)',
  },
  genderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: palette.teal[400],
  },
  // Bottom sheet
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    width: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.teal[400],
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 14,
  },
  maxNote: {
    fontSize: 12,
    color: palette.teal[400],
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  optionRowSelected: {
    backgroundColor: 'rgba(53,157,152,0.1)',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    paddingRight: 8,
  },
  optionTextSelected: {
    color: palette.teal[400],
    fontWeight: '500',
  },
});
