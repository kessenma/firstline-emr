// apps/mobile/src/components/patient-chart/medications/useRxOrderForm.ts

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { usePatientChart } from '../PatientChartContext';
import type {
  CreateRxOrderPayload,
  Prescription,
} from '@fajr/shared/medications';

interface RxOrderFormState {
  doctorSpecialty: string;
  prescribingDr: string;
  drEmail: string;
  drId: string;
  prescribedDate: Date;
  validTill: Date;
  city: string;
  prescriptions: Prescription[];
}

const emptyPrescription: Prescription = {
  diagnosis: '',
  medication: '',
  dosage: '',
  frequency: '',
};

export function useRxOrderForm(patientId: string) {
  const { user } = useAuth();
  const { patientInfo, refreshMedications } = usePatientChart();

  const initialState = useMemo((): RxOrderFormState => {
    const specialty = Array.isArray(user?.doctorSpecialty)
      ? user.doctorSpecialty.join(', ')
      : user?.doctorSpecialty || 'Not Selected';
    return {
      doctorSpecialty: specialty,
      prescribingDr: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      drEmail: user?.email || '',
      drId: user?._id || user?.id || '',
      prescribedDate: new Date(),
      validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      city: patientInfo?.city || '',
      prescriptions: [{ ...emptyPrescription }],
    };
  }, [user, patientInfo?.city]);

  const [form, setForm] = useState<RxOrderFormState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const isFormComplete = useMemo(
    () =>
      form.prescriptions.length > 0 &&
      form.prescriptions.every(
        p =>
          p.diagnosis.trim() &&
          p.medication.trim() &&
          p.dosage.trim() &&
          p.frequency.trim(),
      ),
    [form.prescriptions],
  );

  const updatePrescription = useCallback(
    (index: number, field: keyof Prescription, value: string) => {
      setForm(prev => {
        const updated = [...prev.prescriptions];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, prescriptions: updated };
      });
    },
    [],
  );

  const addPrescription = useCallback(() => {
    setForm(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, { ...emptyPrescription }],
    }));
  }, []);

  const removePrescription = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index),
    }));
  }, []);

  const setValidTill = useCallback((date: Date) => {
    setForm(prev => ({ ...prev, validTill: date }));
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!isFormComplete) return false;
    setIsLoading(true);
    try {
      // patientRxUrl / pharmacyQrUrl / pharmacyQrCode are generated server-side;
      // sending blank placeholders for them only risks overwriting the real ones.
      const payload: CreateRxOrderPayload = { ...form };
      const { error } = await apiClient.post(
        `/api/patient/${patientId}/medications/rx-order`,
        payload,
      );
      if (error) throw new Error(error);
      await refreshMedications();
      setForm(initialState);
      Alert.alert('Success', 'RX Prescription created successfully.');
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create RX order.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [form, isFormComplete, patientId, refreshMedications, initialState]);

  return {
    form,
    isLoading,
    isFormComplete,
    updatePrescription,
    addPrescription,
    removePrescription,
    setValidTill,
    submit,
  };
}
