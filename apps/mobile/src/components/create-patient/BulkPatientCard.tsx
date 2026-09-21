import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import {
  Pencil,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { TextInputField } from '../form/TextInputField';
import { RadioCardField } from '../form/RadioCardField';
import { ParsedPatientRow, ValidationIssue } from '../../utils/csvParser';
import { CountriesList } from '../../data/countries';
import { CountryCodesList } from '../../data/countries';
import { LanguagesList } from '../../data/languages';
import { DoctorSpecialties } from '../../data/doctorSpecialty';
import { MissionOption } from '../../hooks/useMissions';

interface RadioOption {
  label: string;
  value: string;
}

interface BulkPatientCardProps {
  patient: ParsedPatientRow;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (rowId: number, field: string, value: string) => void;
  getCellIssue: (
    rowId: number,
    field: string,
  ) => ValidationIssue | undefined;
  missions: MissionOption[];
}

// All select-type fields that get expandable sections
const SELECT_FIELDS = [
  'gender',
  'country',
  'language',
  'phoneCountryCode',
  'specialty',
  'missionId',
  'hospital',
] as const;

export function BulkPatientCard({
  patient,
  isEditing,
  onToggleEdit,
  onUpdate,
  getCellIssue,
  missions,
}: BulkPatientCardProps) {
  const colors = useThemeColors();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  const selectedMission = missions.find((m) => m.id === patient.missionId);
  const hospitalOptions: RadioOption[] = (
    selectedMission?.hospitals || []
  ).map((h) => {
    const name = typeof h === 'string' ? h : h.name;
    return { label: name, value: name };
  });

  // Only count fields that are actually visible
  const visibleSelectFields = SELECT_FIELDS.filter(
    (f) => f !== 'hospital' || hospitalOptions.length > 0,
  );
  const allExpanded = visibleSelectFields.every((f) =>
    expandedSections.has(f),
  );

  const toggleSection = useCallback((field: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  const toggleAllSections = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (allExpanded) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(visibleSelectFields));
    }
  }, [allExpanded, visibleSelectFields]);

  const collapseSection = useCallback((field: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  const hasErrors = [
    'firstName',
    'lastName',
    'dob',
    'gender',
    'country',
    'phoneCountryCode',
    'phone.phoneNumber',
    'language',
    'specialty',
  ].some((f) => getCellIssue(patient.id, f)?.type === 'error');

  const countryOptions: RadioOption[] = (CountriesList as string[]).map(
    (c) => ({ label: c, value: c }),
  );
  const countryCodeOptions: RadioOption[] = (CountryCodesList as string[]).map(
    (c) => ({ label: c, value: c }),
  );
  const languageOptions: RadioOption[] = (LanguagesList as string[]).map(
    (l) => ({ label: l, value: l }),
  );
  const specialtyOptions: RadioOption[] = (DoctorSpecialties as string[]).map(
    (s) => ({ label: s, value: s }),
  );
  const genderOptions: RadioOption[] = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
  ];
  const missionOptions: RadioOption[] = missions
    .sort((a, b) => {
      const order: Record<string, number> = {
        active: 0,
        planned: 1,
        completed: 2,
      };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .map((m) => ({
      label: `${m.name} (${m.country})${m.isActiveIntake ? ' *' : ''}`,
      value: m.id,
    }));

  const getIssueStyle = (field: string) => {
    const issue = getCellIssue(patient.id, field);
    if (!issue) return {};
    if (issue.type === 'error')
      return { borderColor: colors.error, borderWidth: 1 };
    return { borderColor: '#3b82f6', borderWidth: 1 };
  };

  const getFieldValue = (field: string): string => {
    switch (field) {
      case 'gender':
        return patient.gender;
      case 'country':
        return patient.country;
      case 'language':
        return patient.language;
      case 'phoneCountryCode':
        return patient.phone.countryCode;
      case 'specialty':
        return patient.specialty;
      case 'missionId':
        return patient.missionId;
      case 'hospital':
        return patient.hospital;
      default:
        return '';
    }
  };

  const getFieldOptions = (field: string): RadioOption[] => {
    switch (field) {
      case 'gender':
        return genderOptions;
      case 'country':
        return countryOptions;
      case 'language':
        return languageOptions;
      case 'phoneCountryCode':
        return countryCodeOptions;
      case 'specialty':
        return specialtyOptions;
      case 'missionId':
        return missionOptions;
      case 'hospital':
        return hospitalOptions;
      default:
        return [];
    }
  };

  const getFieldLabel = (field: string): string => {
    switch (field) {
      case 'gender':
        return 'Gender';
      case 'country':
        return 'Country';
      case 'language':
        return 'Language';
      case 'phoneCountryCode':
        return 'Phone Code';
      case 'specialty':
        return 'Specialty';
      case 'missionId':
        return 'Mission';
      case 'hospital':
        return 'Hospital';
      default:
        return field;
    }
  };

  const handleSelectOption = (field: string, value: string) => {
    onUpdate(patient.id, field, value);
    // For mission, also set default hospital
    if (field === 'missionId') {
      const m = missions.find((ms) => ms.id === value);
      onUpdate(patient.id, 'hospital', m?.defaultIntakeHospital || '');
    }
    collapseSection(field);
  };

  const renderExpandableField = (field: string) => {
    const label = getFieldLabel(field);
    const value = getFieldValue(field);
    const options = getFieldOptions(field);
    const isExpanded = expandedSections.has(field);
    const issue = getCellIssue(patient.id, field);
    const isError = issue?.type === 'error';

    // Skip hospital if no options
    if (field === 'hospital' && hospitalOptions.length === 0) return null;

    return (
      <View key={field} style={styles.expandableField}>
        <TouchableOpacity
          onPress={() => toggleSection(field)}
          style={[
            styles.expandableHeader,
            {
              backgroundColor: isExpanded
                ? colors.primary + '08'
                : colors.background,
              borderColor: isError
                ? colors.error
                : isExpanded
                  ? colors.primary + '40'
                  : colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.expandableHeaderLeft}>
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.textSecondary },
              ]}
            >
              {label}
            </Text>
            {!isExpanded && (
              <Text
                style={[
                  styles.fieldValueInline,
                  {
                    color: isError
                      ? colors.error
                      : value
                        ? colors.text
                        : colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {value || 'Not set'}
              </Text>
            )}
          </View>
          {isExpanded ? (
            <ChevronDown size={16} color={colors.textSecondary} />
          ) : (
            <ChevronRight size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.radioCardContainer}>
            <RadioCardField
              options={options}
              value={value || null}
              onChange={(v) => handleSelectOption(field, v)}
              size="small"
              columns={
                field === 'gender' || field === 'phoneCountryCode'
                  ? 2
                  : undefined
              }
              autoFitColumns={
                field === 'country' || field === 'language'
                  ? true
                  : undefined
              }
              error={isError ? `Invalid: ${issue?.originalValue}` : undefined}
            />
          </View>
        )}
      </View>
    );
  };

  const renderTextField = (
    label: string,
    field: string,
    value: string,
    options?: { placeholder?: string; fullWidth?: boolean },
  ) => {
    const issue = getCellIssue(patient.id, field);
    const isError = issue?.type === 'error';
    const containerWidth = options?.fullWidth
      ? styles.textFieldContainerFull
      : styles.textFieldContainer;

    if (isEditing) {
      return (
        <View style={containerWidth}>
          <Text
            style={[styles.fieldLabel, { color: colors.textSecondary }]}
          >
            {label}
          </Text>
          <TextInputField
            value={value}
            onChangeText={(v) => onUpdate(patient.id, field, v)}
            placeholder={options?.placeholder}
            containerStyle={getIssueStyle(field)}
          />
        </View>
      );
    }

    return (
      <View style={containerWidth}>
        <Text
          style={[styles.fieldLabel, { color: colors.textSecondary }]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.fieldValue,
            { color: isError ? colors.error : colors.text },
          ]}
          numberOfLines={1}
        >
          {value || '-'}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: hasErrors
            ? colors.error
            : isEditing
              ? colors.primary + '80'
              : colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.rowBadge,
              { backgroundColor: colors.background },
            ]}
          >
            <Text
              style={[
                styles.rowBadgeText,
                { color: colors.textSecondary },
              ]}
            >
              #{patient.id}
            </Text>
          </View>
          {hasErrors && (
            <View
              style={[
                styles.errorBadge,
                { backgroundColor: colors.error + '20' },
              ]}
            >
              <AlertCircle size={12} color={colors.error} />
              <Text
                style={[
                  styles.errorBadgeText,
                  { color: colors.error },
                ]}
              >
                Has errors
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isEditing && (
            <TouchableOpacity
              onPress={toggleAllSections}
              style={[
                styles.expandAllPill,
                { borderColor: colors.border },
              ]}
            >
              {allExpanded ? (
                <ChevronUp size={14} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={14} color={colors.textSecondary} />
              )}
              <Text
                style={[
                  styles.expandAllText,
                  { color: colors.textSecondary },
                ]}
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onToggleEdit}
            style={[
              styles.editButton,
              {
                backgroundColor: isEditing
                  ? colors.primary
                  : colors.background,
              },
            ]}
          >
            {isEditing ? (
              <Check size={16} color="#fff" />
            ) : (
              <Pencil size={16} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Name */}
      {isEditing ? (
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <TextInputField
              value={patient.firstName}
              onChangeText={(v) => onUpdate(patient.id, 'firstName', v)}
              placeholder="First"
              containerStyle={getIssueStyle('firstName')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInputField
              value={patient.lastName}
              onChangeText={(v) => onUpdate(patient.id, 'lastName', v)}
              placeholder="Last"
              containerStyle={getIssueStyle('lastName')}
            />
          </View>
        </View>
      ) : (
        <Text style={[styles.patientName, { color: colors.text }]}>
          {patient.firstName} {patient.lastName}
        </Text>
      )}

      {isEditing ? (
        /* Editing mode: text fields + expandable radio sections */
        <View style={styles.editingFields}>
          {/* Text input fields */}
          <View style={styles.textFieldsRow}>
            {renderTextField('DOB', 'dob', patient.dob)}
            {renderTextField('City', 'city', patient.city)}
          </View>

          {/* Phone: country code (expandable) + phone number inline */}
          <View>
            <Text
              style={[styles.fieldLabel, { color: colors.textSecondary }]}
            >
              PHONE
            </Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                onPress={() => toggleSection('phoneCountryCode')}
                style={[
                  styles.phoneCodeButton,
                  {
                    borderColor: expandedSections.has('phoneCountryCode')
                      ? colors.primary + '40'
                      : colors.border,
                    backgroundColor: expandedSections.has(
                      'phoneCountryCode',
                    )
                      ? colors.primary + '08'
                      : colors.background,
                  },
                ]}
              >
                <Text style={[styles.phoneCodeText, { color: colors.text }]}>
                  {patient.phone.countryCode || '+?'}
                </Text>
                <ChevronDown size={12} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TextInputField
                  value={patient.phone.phoneNumber}
                  onChangeText={(v) =>
                    onUpdate(patient.id, 'phone.phoneNumber', v)
                  }
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  containerStyle={getIssueStyle('phone.phoneNumber')}
                />
              </View>
            </View>
            {expandedSections.has('phoneCountryCode') && (
              <View style={styles.radioCardContainer}>
                <RadioCardField
                  options={countryCodeOptions}
                  value={patient.phone.countryCode || null}
                  onChange={(v) =>
                    handleSelectOption('phoneCountryCode', v)
                  }
                  size="small"
                  columns={2}
                />
              </View>
            )}
          </View>

          {renderTextField('Allergies', 'allergies', patient.allergies, {
            fullWidth: true,
          })}

          {/* Expandable select fields */}
          <View style={styles.expandableFields}>
            {renderExpandableField('gender')}
            {renderExpandableField('country')}
            {renderExpandableField('language')}
            {renderExpandableField('specialty')}
            {renderExpandableField('missionId')}
            {renderExpandableField('hospital')}
          </View>
        </View>
      ) : (
        /* View mode: compact grid */
        <View style={styles.fieldsGrid}>
          {renderTextField('DOB', 'dob', patient.dob)}
          {renderTextField('Gender', 'gender', patient.gender)}
          {renderTextField('Country', 'country', patient.country)}
          {renderTextField('City', 'city', patient.city)}
          {renderTextField('Language', 'language', patient.language)}
          {renderTextField(
            'Phone',
            'phone.phoneNumber',
            `${patient.phone.countryCode} ${patient.phone.phoneNumber}`,
          )}
          {renderTextField('Allergies', 'allergies', patient.allergies)}
          {renderTextField(
            'Specialty',
            'specialty',
            patient.specialty,
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  rowBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  errorBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  expandAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  expandAllText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  patientName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textFieldContainer: {
    width: '48%',
    gap: 2,
  },
  textFieldContainerFull: {
    width: '100%',
    gap: 2,
  },
  fieldLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: typography.fontSize.sm,
  },
  editingFields: {
    gap: spacing.sm,
  },
  textFieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  phoneCodeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  expandableFields: {
    gap: spacing.xs,
  },
  expandableField: {
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  expandableHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldValueInline: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  radioCardContainer: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
