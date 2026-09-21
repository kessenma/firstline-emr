// apps/mobile/src/components/patient-chart/medications/useMedOrderForm.ts

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { usePatientChart } from '../PatientChartContext';

interface MedicationEntry {
  diagnosis: string;
  medication: string;
  dosage: string;
  frequency: string;
  quantity: string;
}

interface MedOrderFormState {
  doctorSpecialty: string;
  prescribingDr: string;
  drEmail: string;
  drId: string;
  patientName: string;
  patientPhone: string;
  patientCity: string;
  patientCountry: string;
  orderDate: Date;
  validated: boolean;
  medications: MedicationEntry[];
}

const emptyMedication: MedicationEntry = {
  diagnosis: '',
  medication: '',
  dosage: '',
  frequency: '',
  quantity: '',
};

export function useMedOrderForm(patientId: string) {
  const { user } = useAuth();
  const { patientInfo, refreshMedications } = usePatientChart();

  const initialState = useMemo((): MedOrderFormState => {
    const specialty = Array.isArray(user?.doctorSpecialty)
      ? user.doctorSpecialty.join(', ')
      : user?.doctorSpecialty || 'Not Selected';
    return {
      doctorSpecialty: specialty,
      prescribingDr: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      drEmail: user?.email || '',
      drId: user?._id || user?.id || '',
      patientName: patientInfo?.patientName || '',
      patientPhone: typeof patientInfo?.phone === 'string'
        ? patientInfo.phone
        : patientInfo?.phone?.phoneNumber || '',
      patientCity: patientInfo?.city || '',
      patientCountry: patientInfo?.country || '',
      orderDate: new Date(),
      validated: false,
      medications: [{ ...emptyMedication }],
    };
  }, [user, patientInfo]);

  const [form, setForm] = useState<MedOrderFormState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const isFormComplete = useMemo(
    () =>
      form.medications.length > 0 &&
      form.medications.every(
        m =>
          m.diagnosis.trim() &&
          m.medication.trim() &&
          m.dosage.trim() &&
          m.frequency.trim() &&
          m.quantity.trim(),
      ),
    [form.medications],
  );

  const updateMedication = useCallback(
    (index: number, field: keyof MedicationEntry, value: string) => {
      setForm(prev => {
        const updated = [...prev.medications];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, medications: updated };
      });
    },
    [],
  );

  const addMedication = useCallback(() => {
    setForm(prev => ({
      ...prev,
      medications: [...prev.medications, { ...emptyMedication }],
    }));
  }, []);

  const removeMedication = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!isFormComplete) return false;
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        patientId,
      };
      const { error } = await apiClient.post(
        `/api/patient/${patientId}/medications/med-order`,
        payload,
      );
      if (error) throw new Error(error);
      await refreshMedications();
      setForm(initialState);
      Alert.alert('Success', 'Medication request submitted successfully.');
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit medication request.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [form, isFormComplete, patientId, refreshMedications, initialState]);

  return {
    form,
    isLoading,
    isFormComplete,
    updateMedication,
    addMedication,
    removeMedication,
    submit,
  };
}
