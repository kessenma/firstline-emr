// apps/mobile/src/components/admin/sections/createUser/CreateUserView.tsx
// View for creating new users

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Mail,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { getRoleTheme, getRoleColor } from '@fajr/shared/theme';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../../../../utils/theme';
import { RoleIcon } from '../../../ui/RoleIcon';
import { useUserCreationViewModel } from '../../../../viewModels/admin/useUserCreationViewModel';
import { LoadingState, ConfirmDialog } from '../../shared';

// Constants
const DOCTOR_SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Family Medicine',
  'Internal Medicine',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Surgery',
  'Other',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
  'Russian',
  'Other',
];

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Australia',
  'Japan',
  'South Korea',
  'Other',
];

export const CreateUserView: React.FC = () => {
  const colors = useThemeColors();
  const {
    formData,
    updateField,
    isEmailValid,
    emailExists,
    isValidatingEmail,
    isBasicInfoComplete,
    isAccountSpecificComplete,
    isFormComplete,
    createUser,
    resetForm,
    isCreating,
    error,
  } = useUserCreationViewModel();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState<'account' | 'basic' | 'specific'>('account');

  const handleCreateUser = () => {
    if (!isFormComplete) {
      Alert.alert('Incomplete Form', 'Please complete all required fields');
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmCreateUser = async () => {
    const success = await createUser();
    setShowConfirmDialog(false);
    
    if (success) {
      Alert.alert(
        'Success',
        `User ${formData.firstName} ${formData.lastName} has been created and confirmation email sent to ${formData.email}`,
        [
          {
            text: 'Create Another',
            onPress: () => {
              resetForm();
              setCurrentStep('account');
            },
          },
          { text: 'Done' },
        ]
      );
    } else {
      Alert.alert('Error', error || 'Failed to create user');
    }
  };

  const renderAccountTypeSelection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Select Account Type
      </Text>

      {(['Doctor', 'Triage'] as const).map(type => {
        const role = getRoleTheme(type);

        return (
          <TouchableOpacity
            key={type}
            onPress={() => {
              updateField('accountType', type);
              setCurrentStep('basic');
            }}
            style={[
              styles.accountTypeCard,
              {
                backgroundColor: colors.surface,
                borderColor:
                  formData.accountType === type
                    ? getRoleColor(type)
                    : colors.border,
              },
              shadows.sm,
            ]}
          >
            <RoleIcon accountType={type} size={32} />
            <View style={styles.accountTypeContent}>
              <Text style={[styles.accountTypeTitle, { color: colors.text }]}>
                {role.label}
              </Text>
              <Text style={[styles.accountTypeDescription, { color: colors.textSecondary }]}>
                {role.description}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Basic Information
      </Text>

      {/* First Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          First Name *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={formData.firstName}
          onChangeText={(value) => updateField('firstName', value)}
          placeholder="Enter first name"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Last Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Last Name *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={formData.lastName}
          onChangeText={(value) => updateField('lastName', value)}
          placeholder="Enter last name"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Email *
        </Text>
        <View style={styles.inputWithIcon}>
          <Mail size={16} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.inputWithIconText,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={formData.email}
            onChangeText={(value) => updateField('email', value.toLowerCase())}
            placeholder="Enter email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {isValidatingEmail && (
            <Text style={[styles.validationText, { color: colors.textSecondary }]}>
              Checking...
            </Text>
          )}
          {isEmailValid && !emailExists && formData.email && (
            <CheckCircle size={16} color={colors.success} />
          )}
          {emailExists && (
            <AlertCircle size={16} color={colors.error} />
          )}
        </View>
        {emailExists && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            Email already exists
          </Text>
        )}
      </View>

      {/* Gender */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Gender *
        </Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            onPress={() => updateField('gender', 'Male')}
            style={[
              styles.radioButton,
              {
                backgroundColor: formData.gender === 'Male' ? colors.primary : colors.surface,
                borderColor: formData.gender === 'Male' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.radioButtonText,
                { color: formData.gender === 'Male' ? colors.textInverse : colors.text },
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => updateField('gender', 'Female')}
            style={[
              styles.radioButton,
              {
                backgroundColor: formData.gender === 'Female' ? colors.primary : colors.surface,
                borderColor: formData.gender === 'Female' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.radioButtonText,
                { color: formData.gender === 'Female' ? colors.textInverse : colors.text },
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date of Birth (Optional) */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Date of Birth (Optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={formData.dob}
          onChangeText={(value) => updateField('dob', value)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {isBasicInfoComplete && (
        <TouchableOpacity
          onPress={() => setCurrentStep('specific')}
          style={[
            styles.button,
            styles.primaryButton,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText, { color: colors.textInverse }]}>
            Continue
          </Text>
          <ChevronRight size={18} color={colors.textInverse} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAccountSpecific = () => {
    if (!formData.accountType) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {formData.accountType} Information
        </Text>

        {/* Doctor Specialty */}
        {formData.accountType === 'Doctor' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Specialty * (Select at least one)
            </Text>
            <View style={styles.chipContainer}>
              {DOCTOR_SPECIALTIES.map((specialty) => (
                <TouchableOpacity
                  key={specialty}
                  onPress={() => {
                    const current = formData.doctorSpecialty;
                    if (current.includes(specialty)) {
                      updateField(
                        'doctorSpecialty',
                        current.filter((s) => s !== specialty)
                      );
                    } else {
                      updateField('doctorSpecialty', [...current, specialty]);
                    }
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.doctorSpecialty.includes(specialty)
                        ? colors.primary
                        : colors.surface,
                      borderColor: formData.doctorSpecialty.includes(specialty)
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: formData.doctorSpecialty.includes(specialty)
                          ? colors.textInverse
                          : colors.text,
                      },
                    ]}
                  >
                    {specialty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Countries (for Triage) */}
        {formData.accountType === 'Triage' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Countries * (Select at least one)
            </Text>
            <View style={styles.chipContainer}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country}
                  onPress={() => {
                    const current = formData.countries;
                    if (current.includes(country)) {
                      updateField(
                        'countries',
                        current.filter((c) => c !== country)
                      );
                    } else {
                      updateField('countries', [...current, country]);
                    }
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.countries.includes(country)
                        ? colors.primary
                        : colors.surface,
                      borderColor: formData.countries.includes(country)
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: formData.countries.includes(country)
                          ? colors.textInverse
                          : colors.text,
                      },
                    ]}
                  >
                    {country}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Languages (Optional for all) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Languages (Optional)
          </Text>
          <View style={styles.chipContainer}>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language}
                onPress={() => {
                  const current = formData.languages;
                  if (current.includes(language)) {
                    updateField(
                      'languages',
                      current.filter((l) => l !== language)
                    );
                  } else {
                    updateField('languages', [...current, language]);
                  }
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: formData.languages.includes(language)
                      ? colors.primary
                      : colors.surface,
                    borderColor: formData.languages.includes(language)
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: formData.languages.includes(language)
                        ? colors.textInverse
                        : colors.text,
                    },
                  ]}
                >
                  {language}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (isCreating) {
    return <LoadingState message="Creating user..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressSteps}>
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor:
                  currentStep === 'account' || formData.accountType
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.progressStepText,
                {
                  color:
                    currentStep === 'account' || formData.accountType
                      ? colors.textInverse
                      : colors.textSecondary,
                },
              ]}
            >
              1
            </Text>
          </View>
          <View
            style={[
              styles.progressLine,
              {
                backgroundColor:
                  currentStep === 'basic' || isBasicInfoComplete
                    ? colors.primary
                    : colors.border,
              },
            ]}
          />
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor:
                  currentStep === 'basic' || isBasicInfoComplete
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.progressStepText,
                {
                  color:
                    currentStep === 'basic' || isBasicInfoComplete
                      ? colors.textInverse
                      : colors.textSecondary,
                },
              ]}
            >
              2
            </Text>
          </View>
          <View
            style={[
              styles.progressLine,
              {
                backgroundColor:
                  currentStep === 'specific' || isAccountSpecificComplete
                    ? colors.primary
                    : colors.border,
              },
            ]}
          />
          <View
            style={[
              styles.progressStep,
              {
                backgroundColor:
                  currentStep === 'specific' || isAccountSpecificComplete
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.progressStepText,
                {
                  color:
                    currentStep === 'specific' || isAccountSpecificComplete
                      ? colors.textInverse
                      : colors.textSecondary,
                },
              ]}
            >
              3
            </Text>
          </View>
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Account
          </Text>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Basic
          </Text>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Details
          </Text>
        </View>
      </View>

      {/* Step Content */}
      {currentStep === 'account' && renderAccountTypeSelection()}
      {currentStep === 'basic' && renderBasicInfo()}
      {currentStep === 'specific' && renderAccountSpecific()}

      {/* Navigation Buttons */}
      {currentStep !== 'account' && (
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            onPress={() => {
              if (currentStep === 'basic') {
                setCurrentStep('account');
              } else if (currentStep === 'specific') {
                setCurrentStep('basic');
              }
            }}
            style={[
              styles.button,
              styles.secondaryButton,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Back
            </Text>
          </TouchableOpacity>

          {currentStep === 'specific' && isFormComplete && (
            <TouchableOpacity
              onPress={handleCreateUser}
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText, { color: colors.textInverse }]}>
                Create User
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.errorBannerText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Create User"
        message={`Create user ${formData.firstName} ${formData.lastName} (${formData.email}) as ${formData.accountType}?`}
        variant="info"
        confirmLabel="Create"
        onConfirm={confirmCreateUser}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    width: 60,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  accountTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  accountTypeContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  accountTypeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  accountTypeDescription: {
    fontSize: typography.fontSize.sm,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWithIconText: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
  },
  validationText: {
    fontSize: typography.fontSize.xs,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radioButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  radioButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primaryButton: {},
  secondaryButton: {},
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  primaryButtonText: {},
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  errorBannerText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
});
