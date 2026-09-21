// apps/mobile/src/hooks/usePatientDraftViewModel.ts
// View model for patient draft auto-save — mirrors useNoteFormViewModel pattern

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usePowerSyncMutation, usePowerSync } from './powersync';
import { TABLES, generateId, dateToIsoString } from '@/db';

export interface PatientFormData {
  firstName: string;
  lastName: string;
  dob: Date | null;
  language: string;
  chiefComplaint: string;
  hasMedications: string | null;
  currentMeds: string;
  hasAllergies: string | null;
  allergies: string;
  city: string;
  country: string;
  phoneCountryCode: string;
  phoneNumber: string;
  specialty: string;
  missionId: string;
  hospital: string;
}

const emptyForm = (): PatientFormData => ({
  firstName: '',
  lastName: '',
  dob: null,
  language: 'English',
  chiefComplaint: '',
  hasMedications: null,
  currentMeds: '',
  hasAllergies: null,
  allergies: '',
  city: '',
  country: '',
  phoneCountryCode: '+972',
  phoneNumber: '',
  specialty: '',
  missionId: '',
  hospital: '',
});

/** Required fields for enabling the "Create Patient" button */
const REQUIRED_FIELDS: (keyof PatientFormData)[] = [
  'firstName',
  'lastName',
];

export function usePatientDraftViewModel() {
  const { user } = useAuth();
  const { service, isInitialized } = usePowerSync();

  const [form, setForm] = useState<PatientFormData>(emptyForm);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const userId = user?._id || user?.id || '';

  const mutation = usePowerSyncMutation(
    async (variables: { sql: string; params: any[] }) => {
      if (!isInitialized || !service) {
        throw new Error('PowerSync not initialized');
      }
      await service.execute(variables.sql, variables.params);
      return { success: true };
    },
    {
      onError: (error) => {
        console.error('❌ Patient draft mutation failed:', error);
      },
    },
  );

  /** Check if all required fields are filled — controls "Create Patient" button */
  const isValid = useMemo(() => {
    return REQUIRED_FIELDS.every((key) => {
      const val = form[key];
      if (typeof val === 'string') return val.trim().length > 0;
      return val !== null && val !== undefined;
    });
  }, [form]);

  /** Check if the form has any content (for auto-save — don't save empty forms) */
  const hasContent = useMemo(() => {
    return !!(
      form.firstName.trim() ||
      form.lastName.trim() ||
      form.chiefComplaint.trim() ||
      form.city.trim() ||
      form.country.trim() ||
      form.phoneNumber.trim() ||
      form.currentMeds.trim() ||
      form.allergies.trim()
    );
  }, [form]);

  const updateField = useCallback(<K extends keyof PatientFormData>(
    key: K,
    value: PatientFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingDraftId(null);
    setIsDirty(false);
  }, []);

  /** Build a SQLite-compatible data object from form state */
  const buildRowData = useCallback(() => {
    const now = dateToIsoString(new Date());
    return {
      first_name: form.firstName.trim() || null,
      last_name: form.lastName.trim() || null,
      dob: form.dob ? dateToIsoString(form.dob) : null,
      language: form.language || null,
      chief_complaint: form.chiefComplaint.trim() || null,
      current_meds: form.currentMeds.trim() || null,
      allergies: form.allergies.trim() || null,
      city: form.city.trim() || null,
      country: form.country || null,
      phone: form.phoneNumber
        ? JSON.stringify({
            countryCode: form.phoneCountryCode,
            phoneNumber: form.phoneNumber,
          })
        : null,
      specialties: form.specialty ? JSON.stringify([form.specialty]) : null,
      mission_id: form.missionId || null,
      hospital: form.hospital || null,
      created_by_id: userId || null,
      updated_at: now,
    };
  }, [form, userId]);

  /** Save current form as a draft (create or update). Does NOT reset form. */
  const saveDraft = useCallback(async () => {
    if (!hasContent) return false;

    const data = buildRowData();
    const now = dateToIsoString(new Date());

    try {
      if (editingDraftId) {
        // Update existing draft
        const fields = Object.keys(data);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = Object.values(data);

        await mutation.mutateAsync({
          sql: `UPDATE ${TABLES.PATIENT_DRAFTS} SET ${setClause} WHERE id = ?`,
          params: [...values, editingDraftId],
        });
      } else {
        // Create new draft in local-only patient_drafts table
        const draftId = generateId();
        await mutation.mutateAsync({
          sql: `INSERT INTO ${TABLES.PATIENT_DRAFTS}
                (id, ${Object.keys(data).join(', ')}, created_at)
                VALUES (?, ${Object.keys(data).map(() => '?').join(', ')}, ?)`,
          params: [
            draftId,
            ...Object.values(data),
            now,
          ],
        });
        setEditingDraftId(draftId);
      }
      setIsDirty(false);
      return true;
    } catch (err) {
      console.error('Auto-save failed:', err);
      return false;
    }
  }, [hasContent, buildRowData, editingDraftId, mutation]);

  /** Publish the current draft — inserts into patients (synced) and deletes from drafts (local-only). */
  const publishPatient = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return false;
    }

    setPublishing(true);
    const data = buildRowData();
    const now = dateToIsoString(new Date());

    try {
      // Insert into the synced patients table (triggers PowerSync upload)
      const patientId = editingDraftId || generateId();
      await mutation.mutateAsync({
        sql: `INSERT INTO ${TABLES.PATIENTS}
              (id, ${Object.keys(data).join(', ')}, status, priority, created_at)
              VALUES (?, ${Object.keys(data).map(() => '?').join(', ')}, ?, ?, ?)`,
        params: [
          patientId,
          ...Object.values(data),
          'Pre-Op / Not Cleared',
          'Not Selected',
          now,
        ],
      });

      // If publishing an existing draft, delete it from the local-only drafts table
      if (editingDraftId) {
        await mutation.mutateAsync({
          sql: `DELETE FROM ${TABLES.PATIENT_DRAFTS} WHERE id = ?`,
          params: [editingDraftId],
        });
      }

      resetForm();
      return true;
    } catch (err) {
      console.error('Failed to publish patient:', err);
      Alert.alert('Error', 'Failed to create patient. Please try again.');
      return false;
    } finally {
      setPublishing(false);
    }
  }, [isValid, buildRowData, editingDraftId, mutation, resetForm]);

  /** Load an existing draft into the form */
  const loadDraft = useCallback(async (draftId: string) => {
    if (!service) return;

    try {
      const rows = await service.query<any>(
        `SELECT * FROM ${TABLES.PATIENT_DRAFTS} WHERE id = ? LIMIT 1`,
        [draftId],
      );
      const row = rows[0];
      if (!row) return;

      let phone: { countryCode?: string; phoneNumber?: string } | undefined;
      try {
        if (row.phone && typeof row.phone === 'string') {
          phone = JSON.parse(row.phone);
        }
      } catch {}

      let specialties: string[] = [];
      try {
        if (row.specialties && typeof row.specialties === 'string') {
          specialties = JSON.parse(row.specialties);
        }
      } catch {}

      setForm({
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        dob: row.dob ? new Date(row.dob) : null,
        language: row.language || 'English',
        chiefComplaint: row.chief_complaint || '',
        hasMedications: row.current_meds ? 'Yes' : null,
        currentMeds: row.current_meds || '',
        hasAllergies: row.allergies
          ? row.allergies === 'No allergies'
            ? 'No allergies'
            : 'Yes'
          : null,
        allergies: row.allergies || '',
        city: row.city || '',
        country: row.country || '',
        phoneCountryCode: phone?.countryCode || '+972',
        phoneNumber: phone?.phoneNumber || '',
        specialty: specialties[0] || '',
        missionId: row.mission_id || '',
        hospital: row.hospital || '',
      });
      setEditingDraftId(draftId);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  }, [service]);

  /** Delete a draft by ID */
  const deleteDraft = useCallback(
    async (draftId: string) => {
      return new Promise<boolean>((resolve) => {
        Alert.alert('Delete Draft', 'Are you sure you want to delete this draft?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await mutation.mutateAsync({
                  sql: `DELETE FROM ${TABLES.PATIENT_DRAFTS} WHERE id = ?`,
                  params: [draftId],
                });
                if (editingDraftId === draftId) {
                  resetForm();
                }
                resolve(true);
              } catch (err) {
                console.error('Failed to delete draft:', err);
                Alert.alert('Error', 'Failed to delete draft.');
                resolve(false);
              }
            },
          },
        ]);
      });
    },
    [mutation, editingDraftId, resetForm],
  );

  return {
    form,
    updateField,
    resetForm,
    isValid,
    hasContent,
    isDirty,
    editingDraftId,
    saveDraft,
    publishPatient,
    loadDraft,
    deleteDraft,
    publishing,
    loading: mutation.loading,
    error: mutation.error,
  };
}
