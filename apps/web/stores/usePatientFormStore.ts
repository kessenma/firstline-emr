// apps/web/stores/usePatientFormStore.ts
import { create } from "zustand"
import type { NewPatientFormTelegramValues } from "@/components/telegram-patient/container/intake-form/view-model/NewPatientFormTelegramViewModel"

// Define more specific types for better type safety
interface FormDataState {
    formData: Partial<NewPatientFormTelegramValues>
    setFormData: (data: Partial<NewPatientFormTelegramValues>) => void
}

interface UIState {
    showModal: boolean
    showErrorModal: boolean
    setShowModal: (show: boolean) => void
    setShowErrorModal: (show: boolean) => void
}

interface StatusState {
    error: string | null
    submitting: boolean
    setError: (error: string | null) => void
    setSubmitting: (submitting: boolean) => void
}

// Combine all states into one interface
interface PatientFormState extends FormDataState, UIState, StatusState {
    reset: () => void
    isFormComplete: () => boolean
}

// Helper function to safely access nested properties (replacement for lodash.get)
function getNestedValue(obj: any, path: string, defaultValue: any = undefined) {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === undefined || result === null) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

export const usePatientFormStore = create<PatientFormState>((set, get) => ({
    // Form data state
    formData: {},
    setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),

    // UI state
    showModal: false,
    showErrorModal: false,
    setShowModal: (show) => set({ showModal: show }),
    setShowErrorModal: (show) => set({ showErrorModal: show }),

    // Status state
    error: null,
    submitting: false,
    setError: (error) => set({ error }),
    setSubmitting: (submitting) => set({ submitting }),

    // Actions
    reset: () =>
        set({
            formData: {},
            showModal: false,
            showErrorModal: false,
            error: null,
            submitting: false,
        }),

    // Helper function to check if form is complete - fixed to always return boolean
    isFormComplete: () => {
        const { formData } = get();
        const requiredFields = [
            "firstName", "lastName", "dob", "country",
            "city", "chiefComplaint", "genderPreference"
        ];

        // Check if all required fields are filled
        const requiredFieldsComplete = requiredFields.every(field => {
            const value = formData[field as keyof typeof formData];
            return value !== undefined && value !== null && value !== "";
        });

        // Check phone fields
        const phoneCountryCode = formData.phone?.countryCode;
        const phoneNumber = formData.phone?.phoneNumber;
        const phoneComplete = Boolean(phoneCountryCode && phoneNumber);

        // Check patient relation logic
        const isPatient = Boolean(formData.isPatientFields?.isPatient);
        const patientRelation = formData.isPatientFields?.patientRelation || "";

        // If isPatient is false, patientRelation must be filled
        const patientRelationComplete = isPatient || (patientRelation.trim() !== "");

        return Boolean(requiredFieldsComplete && phoneComplete && patientRelationComplete);
    }
}))