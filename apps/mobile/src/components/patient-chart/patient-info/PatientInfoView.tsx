// apps/mobile/src/components/patient-chart/patient-info/PatientInfoView.tsx
// Full patient info view with edit/save toggle, matching web PatientInfoView

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Edit3, Save, X } from 'lucide-react-native';
import { usePatientChart } from '../PatientChartContext';
import { useMissions } from '../../../hooks/useMissions';
import { TextInputField } from '../../form/TextInputField';
import { SingleSelectField, type SelectOption } from '../../form/SelectField';
import ReadOnlyField from '../../form/ReadOnlyField';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { TokenStorage } from '../../../services/TokenStorage';
import { getApiUrl } from '../../../config';
import { format } from 'date-fns';

// Countries and languages lists for dropdowns
import { CountriesList } from '../../../data/countries';
import { LanguagesList } from '../../../data/languages';

interface EditableFields {
  bmi: string;
  email: string;
  country: string;
  city: string;
  language: string;
  occupation: string;
  allergies: string;
  pmhx: string;
  pshx: string;
  famhx: string;
  drinkCount: string;
  smokeCount: string;
  otherDrugs: string;
  currentMeds: string;
  prevMeds: string;
  missionId: string;
  hospital: string;
}

export const PatientInfoView: React.FC = () => {
  const colors = useThemeColors();
  const {
    patientInfo,
    patientViewModel,
    loadingPatientInfo,
    fetchPatientData,
  } = usePatientChart();
  const { missions } = useMissions();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const expandedDetails = patientViewModel?.getExpandedDetails();

  // Editable form state
  const [formValues, setFormValues] = useState<EditableFields>({
    bmi: '',
    email: '',
    country: '',
    city: '',
    language: '',
    occupation: '',
    allergies: '',
    pmhx: '',
    pshx: '',
    famhx: '',
    drinkCount: '',
    smokeCount: '',
    otherDrugs: '',
    currentMeds: '',
    prevMeds: '',
    missionId: '',
    hospital: '',
  });

  const updateField = useCallback(
    (field: keyof EditableFields, value: string) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const startEditing = useCallback(() => {
    // Populate form with current values
    setFormValues({
      bmi: expandedDetails?.bmi || '',
      email: patientInfo?.email || '',
      country: patientInfo?.country || '',
      city: patientInfo?.city || '',
      language: patientInfo?.language || '',
      occupation: expandedDetails?.occupation || '',
      allergies: expandedDetails?.allergies || '',
      pmhx: expandedDetails?.pmhx || '',
      pshx: expandedDetails?.pshx || '',
      famhx: expandedDetails?.famhx || '',
      drinkCount: expandedDetails?.drinkCount || '',
      smokeCount: expandedDetails?.smokeCount || '',
      otherDrugs: expandedDetails?.otherDrugs || '',
      currentMeds: expandedDetails?.currentMeds || '',
      prevMeds: expandedDetails?.prevMeds || '',
      missionId: patientInfo?.missionId || '',
      hospital: patientInfo?.hospital || '',
    });
    setIsEditing(true);
  }, [patientInfo, expandedDetails]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveChanges = useCallback(async () => {
    if (!patientInfo?.patientID) return;

    setIsSaving(true);
    try {
      const token = TokenStorage.getAuthToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(
        getApiUrl(`/patient/${patientInfo.patientID}`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bmi: formValues.bmi || undefined,
            email: formValues.email || undefined,
            country: formValues.country || undefined,
            city: formValues.city || undefined,
            language: formValues.language || undefined,
            occupation: formValues.occupation || undefined,
            allergies: formValues.allergies || undefined,
            pmhx: formValues.pmhx || undefined,
            pshx: formValues.pshx || undefined,
            famhx: formValues.famhx || undefined,
            drinkCount: formValues.drinkCount || undefined,
            smokeCount: formValues.smokeCount || undefined,
            otherDrugs: formValues.otherDrugs || undefined,
            currentMeds: formValues.currentMeds || undefined,
            prevMeds: formValues.prevMeds || undefined,
            missionId: formValues.missionId || null,
            hospital: formValues.hospital || null,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update: ${errorText}`);
      }

      setIsEditing(false);
      // Refresh data from PowerSync after API update syncs back
      await fetchPatientData();
      Alert.alert('Success', 'Patient information updated.');
    } catch (error) {
      console.error('Error updating patient:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update patient.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [patientInfo, formValues, fetchPatientData]);

  // Build mission options for dropdown
  const missionOptions: SelectOption[] = missions.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.country})`,
  }));

  // Hospital options from the patient's mission
  const patientMission = missions.find((m) => m.id === (formValues.missionId || patientInfo?.missionId));
  const hospitalOptions: SelectOption[] = (patientMission?.hospitals || []).map(
    (h: any) => {
      const name = typeof h === 'string' ? h : h.name;
      return { value: name, label: name };
    },
  );

  // Country options
  const countryOptions: SelectOption[] = (CountriesList || []).map(
    (c: string) => ({
      value: c,
      label: c,
    }),
  );

  // Language options
  const languageOptions: SelectOption[] = (LanguagesList || []).map(
    (l: string) => ({
      value: l,
      label: l,
    }),
  );

  if (loadingPatientInfo && !patientInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading patient info...
        </Text>
      </View>
    );
  }

  if (!patientInfo) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No patient information available
        </Text>
      </View>
    );
  }

  const dobDisplay = patientInfo.dob
    ? format(new Date(patientInfo.dob), 'PPP')
    : 'N/A';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header with edit toggle */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Demographics
        </Text>
        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={cancelEditing}
              style={[styles.actionButton, { borderColor: colors.border }]}
              disabled={isSaving}
            >
              <X size={18} color={colors.textSecondary} />
              <Text
                style={[styles.actionButtonText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveChanges}
              style={[styles.actionButton, styles.saveButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Save size={18} color={colors.textInverse} />
                  <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={startEditing}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            <Edit3 size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Demographics Section */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <ReadOnlyField
          fieldName="name"
          fieldLabel="Name"
          value={patientInfo.patientName}
        />
        <ReadOnlyField fieldName="dob" fieldLabel="Date of Birth" value={dobDisplay} />
        <ReadOnlyField
          fieldName="gender"
          fieldLabel="Gender"
          value={patientInfo.gender || 'N/A'}
        />
        <ReadOnlyField
          fieldName="phone"
          fieldLabel="Phone"
          value={`${patientInfo.phone.countryCode} ${patientInfo.phone.phoneNumber}`.trim() || 'N/A'}
        />

        {isEditing ? (
          <>
            <TextInputField
              label="BMI"
              value={formValues.bmi}
              onChangeText={(v) => updateField('bmi', v)}
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Email"
              value={formValues.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.fieldSpacing}
            />
            <SingleSelectField
              label="Language"
              options={languageOptions}
              value={formValues.language}
              onChange={(v) => updateField('language', v)}
              searchable
              containerStyle={styles.fieldSpacing}
            />
            <SingleSelectField
              label="Country"
              options={countryOptions}
              value={formValues.country}
              onChange={(v) => updateField('country', v)}
              searchable
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="City"
              value={formValues.city}
              onChangeText={(v) => updateField('city', v)}
              containerStyle={styles.fieldSpacing}
            />
            <SingleSelectField
              label="Mission"
              options={missionOptions}
              value={formValues.missionId}
              onChange={(v) => updateField('missionId', v)}
              placeholder="Select a mission"
              containerStyle={styles.fieldSpacing}
            />
            {hospitalOptions.length > 0 && (
              <SingleSelectField
                label="Hospital"
                options={hospitalOptions}
                value={formValues.hospital}
                onChange={(v) => updateField('hospital', v)}
                placeholder="Select a hospital"
                containerStyle={styles.fieldSpacing}
              />
            )}
          </>
        ) : (
          <>
            <ReadOnlyField
              fieldName="bmi"
              fieldLabel="BMI"
              value={expandedDetails?.bmi || 'N/A'}
            />
            <ReadOnlyField
              fieldName="email"
              fieldLabel="Email"
              value={patientInfo.email || 'N/A'}
            />
            <ReadOnlyField
              fieldName="language"
              fieldLabel="Language"
              value={patientInfo.language || 'N/A'}
            />
            <ReadOnlyField
              fieldName="country"
              fieldLabel="Country"
              value={patientInfo.country || 'N/A'}
            />
            <ReadOnlyField
              fieldName="city"
              fieldLabel="City"
              value={patientInfo.city || 'N/A'}
            />
            <ReadOnlyField
              fieldName="mission"
              fieldLabel="Mission"
              value={patientInfo.missionName || 'N/A'}
            />
            <ReadOnlyField
              fieldName="hospital"
              fieldLabel="Hospital"
              value={patientInfo.hospital || 'N/A'}
            />
          </>
        )}
      </View>

      {/* Past History Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Past History
        </Text>
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {isEditing ? (
          <>
            <TextInputField
              label="Job/Occupation"
              value={formValues.occupation}
              onChangeText={(v) => updateField('occupation', v)}
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Allergies"
              value={formValues.allergies}
              onChangeText={(v) => updateField('allergies', v)}
              multiline
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Past Medical Hx"
              value={formValues.pmhx}
              onChangeText={(v) => updateField('pmhx', v)}
              multiline
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Surgical Hx"
              value={formValues.pshx}
              onChangeText={(v) => updateField('pshx', v)}
              multiline
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Family Hx"
              value={formValues.famhx}
              onChangeText={(v) => updateField('famhx', v)}
              multiline
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Alcohol Use"
              value={formValues.drinkCount}
              onChangeText={(v) => updateField('drinkCount', v)}
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Smoking Status"
              value={formValues.smokeCount}
              onChangeText={(v) => updateField('smokeCount', v)}
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Drug Use"
              value={formValues.otherDrugs}
              onChangeText={(v) => updateField('otherDrugs', v)}
              containerStyle={styles.fieldSpacing}
            />
          </>
        ) : (
          <>
            <ReadOnlyField
              fieldName="occupation"
              fieldLabel="Job/Occupation"
              value={expandedDetails?.occupation || 'N/A'}
            />
            <ReadOnlyField
              fieldName="allergies"
              fieldLabel="Allergies"
              value={expandedDetails?.allergies || 'N/A'}
            />
            <ReadOnlyField
              fieldName="pmhx"
              fieldLabel="Past Medical Hx"
              value={expandedDetails?.pmhx || 'N/A'}
            />
            <ReadOnlyField
              fieldName="pshx"
              fieldLabel="Surgical Hx"
              value={expandedDetails?.pshx || 'N/A'}
            />
            <ReadOnlyField
              fieldName="famhx"
              fieldLabel="Family Hx"
              value={expandedDetails?.famhx || 'N/A'}
            />
            <ReadOnlyField
              fieldName="drinkCount"
              fieldLabel="Alcohol Use"
              value={expandedDetails?.drinkCount || 'N/A'}
            />
            <ReadOnlyField
              fieldName="smokeCount"
              fieldLabel="Smoking Status"
              value={expandedDetails?.smokeCount || 'N/A'}
            />
            <ReadOnlyField
              fieldName="otherDrugs"
              fieldLabel="Drug Use"
              value={expandedDetails?.otherDrugs || 'N/A'}
            />
          </>
        )}
      </View>

      {/* Prescription History Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Prescription History
        </Text>
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {isEditing ? (
          <>
            <TextInputField
              label="Current Medications"
              value={formValues.currentMeds}
              onChangeText={(v) => updateField('currentMeds', v)}
              multiline
              containerStyle={styles.fieldSpacing}
            />
            <TextInputField
              label="Previous Medications"
              value={formValues.prevMeds}
              onChangeText={(v) => updateField('prevMeds', v)}
              multiline
              containerStyle={styles.fieldSpacing}
            />
          </>
        ) : (
          <>
            <ReadOnlyField
              fieldName="currentMeds"
              fieldLabel="Current Medications"
              value={expandedDetails?.currentMeds || 'N/A'}
            />
            <ReadOnlyField
              fieldName="prevMeds"
              fieldLabel="Previous Medications"
              value={expandedDetails?.prevMeds || 'N/A'}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  saveButton: {},
  saveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  fieldSpacing: {
    marginTop: spacing.sm,
  },
});
