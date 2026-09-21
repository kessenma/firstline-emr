import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { TextInputField } from '../form/TextInputField';
import { TextAreaField } from '../form/TextAreaField';
import { SingleSelectField, SelectOption } from '../form/SelectField';
import { DatePickerField } from '../form/DatePickerField';
import { PhoneInputField } from '../form/PhoneInputField';
import { RadioCardField } from '../form/RadioCardField';
import { Button } from '../ui/Button';
import { useMissions } from '../../hooks/useMissions';
import { CountriesList } from '../../data/countries';
import { LanguagesList } from '../../data/languages';
import { DoctorSpecialties } from '../../data/doctorSpecialty';
import { usePatientDraftViewModel } from '../../hooks/usePatientDraftViewModel';
import { SendHorizonal, Save } from 'lucide-react-native';

// --- Isolated auto-save indicator (owns its own state to avoid re-rendering the form tree) ---
interface AutoSaveIndicatorProps {
  hasContent: boolean;
  saveDraftRef: React.MutableRefObject<() => Promise<boolean>>;
  autoSaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  formDeps: any;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = React.memo(({
  hasContent,
  saveDraftRef,
  autoSaveTimerRef,
  formDeps,
}) => {
  const colors = useThemeColors();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitializedRef = useRef(false);

  // Mark as initialized after initial population completes (500ms delay)
  useEffect(() => {
    isInitializedRef.current = false;
    const t = setTimeout(() => { isInitializedRef.current = true; }, 500);
    return () => clearTimeout(t);
  }, []);

  // Debounced auto-save draft as user types (2s debounce)
  useEffect(() => {
    if (!isInitializedRef.current || !hasContent) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setStatus('saving');
      const [success] = await Promise.all([
        saveDraftRef.current(),
        new Promise(r => setTimeout(r, 800)), // min visible duration
      ]);
      setStatus(success ? 'saved' : 'idle');
      if (success) setTimeout(() => setStatus('idle'), 2000);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasContent, formDeps]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'idle') return null;

  return (
    <View style={styles.autoSaveRow}>
      {status === 'saving' ? (
        <>
          <Save size={14} color={colors.textSecondary} />
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </>
      ) : (
        <Text style={[styles.autoSaveText, { color: colors.success }]}>Saved</Text>
      )}
    </View>
  );
});
AutoSaveIndicator.displayName = 'AutoSaveIndicator';

// --- Main form component ---
interface SinglePatientFormProps {
  onSuccess: () => void;
  draftId?: string;
}

export function SinglePatientForm({ onSuccess, draftId }: SinglePatientFormProps) {
  const colors = useThemeColors();
  const { missions } = useMissions();
  const vm = usePatientDraftViewModel();

  // Load existing draft if resuming
  useEffect(() => {
    if (draftId) {
      vm.loadDraft(draftId);
    }
  }, [draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select active intake mission (only for new patients, not drafts)
  const activeIntake = missions.find((m) => m.isActiveIntake);
  useEffect(() => {
    if (activeIntake && !vm.form.missionId && !draftId) {
      vm.updateField('missionId', activeIntake.id);
      vm.updateField('hospital', activeIntake.defaultIntakeHospital || '');
    }
  }, [activeIntake]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save refs (shared with AutoSaveIndicator)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDraftRef = useRef(vm.saveDraft);
  saveDraftRef.current = vm.saveDraft;
  const formDeps = useMemo(() => vm.form, [vm.form]);

  // Derive hospital options from selected mission
  const selectedMission = missions.find((m) => m.id === vm.form.missionId);
  const hospitalOptions: SelectOption[] = (
    selectedMission?.hospitals || []
  ).map((h) => {
    const name = typeof h === 'string' ? h : h.name;
    return { label: name, value: name };
  });

  const handlePublish = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const success = await vm.publishPatient();
    if (success) onSuccess();
  };

  const languageOptions: SelectOption[] = (LanguagesList as string[]).map(
    (l) => ({ label: l, value: l }),
  );
  const countryOptions: SelectOption[] = (CountriesList as string[]).map(
    (c) => ({ label: c, value: c }),
  );
  const specialtyOptions: SelectOption[] = (DoctorSpecialties as string[]).map(
    (s) => ({ label: s, value: s }),
  );
  const missionOptions: SelectOption[] = missions
    .sort((a, b) => {
      const order: Record<string, number> = {
        active: 0,
        planned: 1,
        completed: 2,
      };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .map((m) => ({
      label: `${m.name} (${m.country})${m.isActiveIntake ? ' - Active Intake' : ''}`,
      value: m.id,
    }));

  const yesNoOptions = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ];

  return (
    <View style={styles.content}>
      {/* Auto-save indicator */}
      <AutoSaveIndicator
        hasContent={vm.hasContent}
        saveDraftRef={saveDraftRef}
        autoSaveTimerRef={autoSaveTimerRef}
        formDeps={formDeps}
      />

      {vm.error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: colors.error + '15', borderColor: colors.error },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            {vm.error instanceof Error ? vm.error.message : String(vm.error)}
          </Text>
        </View>
      )}

      <TextInputField
        label="First Name"
        required
        value={vm.form.firstName}
        onChangeText={(v) => vm.updateField('firstName', v)}
        placeholder="First name"
      />

      <TextInputField
        label="Last Name"
        required
        value={vm.form.lastName}
        onChangeText={(v) => vm.updateField('lastName', v)}
        placeholder="Last name"
      />

      <DatePickerField
        label="Date of Birth"
        value={vm.form.dob}
        onChange={(d) => vm.updateField('dob', d)}
        type="past"
      />

      <SingleSelectField
        label="Language"
        options={languageOptions}
        value={vm.form.language}
        onChange={(v) => vm.updateField('language', v)}
      />

      <TextAreaField
        label="Chief Complaint"
        value={vm.form.chiefComplaint}
        onChangeText={(v) => vm.updateField('chiefComplaint', v)}
        placeholder="Describe the chief complaint..."
        minHeight={80}
      />

      <RadioCardField
        label="Currently taking any medications?"
        options={yesNoOptions}
        value={vm.form.hasMedications}
        onChange={(v) => {
          vm.updateField('hasMedications', v);
          if (v === 'No') vm.updateField('currentMeds', '');
        }}
        direction="horizontal"
        size="small"
      />

      {vm.form.hasMedications === 'Yes' && (
        <TextAreaField
          label="Current Medications"
          value={vm.form.currentMeds}
          onChangeText={(v) => vm.updateField('currentMeds', v)}
          placeholder="List current medications..."
          minHeight={80}
        />
      )}

      <RadioCardField
        label="Do you have any allergies?"
        options={[
          { label: 'Yes', value: 'Yes' },
          { label: 'No allergies', value: 'No allergies' },
        ]}
        value={vm.form.hasAllergies}
        onChange={(v) => {
          vm.updateField('hasAllergies', v);
          if (v === 'No allergies') vm.updateField('allergies', 'No allergies');
          else vm.updateField('allergies', '');
        }}
        direction="horizontal"
        size="small"
      />

      {vm.form.hasAllergies === 'Yes' && (
        <TextAreaField
          label="Allergies"
          value={vm.form.allergies}
          onChangeText={(v) => vm.updateField('allergies', v)}
          placeholder="List allergies..."
          minHeight={80}
        />
      )}

      <TextInputField
        label="City"
        value={vm.form.city}
        onChangeText={(v) => vm.updateField('city', v)}
        placeholder="City"
      />

      <SingleSelectField
        label="Country"
        options={countryOptions}
        value={vm.form.country}
        onChange={(v) => vm.updateField('country', v)}
        searchable
      />

      <RadioCardField
        label="Mission"
        options={missionOptions}
        value={vm.form.missionId}
        onChange={(v) => {
          vm.updateField('missionId', v);
          const mission = missions.find((m) => m.id === v);
          vm.updateField('hospital', mission?.defaultIntakeHospital || '');
        }}
        collapsedCount={4}
        size="small"
      />

      <RadioCardField
        label="Hospital"
        options={hospitalOptions}
        value={vm.form.hospital}
        onChange={(v) => vm.updateField('hospital', v)}
        collapsedCount={4}
        size="small"
        helperText={
          !vm.form.missionId
            ? 'Select a mission first'
            : hospitalOptions.length === 0
              ? 'No hospitals for this mission'
              : undefined
        }
      />

      <PhoneInputField
        label="Phone"
        countryCode={vm.form.phoneCountryCode}
        phoneNumber={vm.form.phoneNumber}
        onCountryCodeChange={(v) => vm.updateField('phoneCountryCode', v)}
        onPhoneNumberChange={(v) => vm.updateField('phoneNumber', v)}
      />

      <SingleSelectField
        label="Specialty"
        options={specialtyOptions}
        value={vm.form.specialty}
        onChange={(v) => vm.updateField('specialty', v)}
      />

      <View style={styles.submitContainer}>
        <Button
          onPress={handlePublish}
          disabled={!vm.isValid || vm.publishing}
          style={[
            styles.submitButton,
            {
              backgroundColor: vm.isValid ? colors.primary : colors.border,
              opacity: vm.isValid ? 1 : 0.5,
            },
          ]}
        >
          {vm.publishing ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <View style={styles.submitContent}>
              <SendHorizonal size={18} color={colors.textInverse} />
              <Text style={[styles.submitText, { color: colors.textInverse }]}>Create Patient</Text>
            </View>
          )}
        </Button>
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  errorBanner: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
  },
  autoSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 20,
  },
  autoSaveText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitContainer: {
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submitText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
