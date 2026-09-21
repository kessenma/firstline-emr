// apps/web/components/telegram-patient/container/intake-form/view/NewPatientFormTelegramView.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { usePatientFormStore } from "@/stores/usePatientFormStore";
import {
  useNewPatientFormTelegramViewModel,
  type NewPatientFormTelegramValues,
} from "../view-model/NewPatientFormTelegramViewModel";
import {
  preserveFormValues,
  validateFormCompleteness,
} from "./utils/form-helpers";
import { LoadingState } from "./form-ui/LoadingState";
import { PatientInfoFields } from "./form-ui/PatientInfoFields";
import { ChiefComplaintField } from "./form-ui/ChiefComplaintField";
import { GenderPreferenceField } from "./form-ui/GenderPreferenceField";
import { CurrentMedicationsField } from "./form-ui/CurrentMedicationsField";
import { AllergiesField } from "./form-ui/AllergiesField";
import { PatientRelationFields } from "./form-ui/PatientRelationFields";
import { SubmitButton } from "./form-ui/SubmitButton";
import { PatientIdAccordion } from "./form-ui/PatientIdAccordion";
import { FormProgressTracker } from "./form-ui/0FormProgressTracker";

type NewPatientFormTelegramViewProps = {
  onSubmitAction: (formData: NewPatientFormTelegramValues) => Promise<void>;
  initialData?: Partial<NewPatientFormTelegramValues>;
  patientId?: string;
  setFormDataStateAction: (data: any) => void;
  setShowModalAction: (show: boolean) => void;
};

export function NewPatientFormTelegramView({
  onSubmitAction,
  initialData,
  patientId,
  setFormDataStateAction,
  setShowModalAction,
}: NewPatientFormTelegramViewProps) {
  // Use the language from the Zustand store
  const { language } = useLanguageStore();
  const prevLanguageRef = useRef(language);
  const [isPatient, setIsPatient] = useState(
    initialData?.isPatientFields?.isPatient ?? true,
  );
  const [isFormValid, setIsFormValid] = useState(false);
  const { isFormComplete } = usePatientFormStore();

  const extendedInitialData = {
    ...initialData,
    preferredLanguage: language, // Use the language from the store
  };

  // Initialize the form-ui first before using it
  const { form, submitting, handleSubmit, loading } =
    useNewPatientFormTelegramViewModel({
      initialData: extendedInitialData,
      patientId,
      onSubmit: onSubmitAction,
      setFormDataState: setFormDataStateAction,
      setShowModal: setShowModalAction,
    });

  // Define required fields for progress tracking
  const requiredFields = useMemo(
    () => [
      "firstName",
      "lastName",
      "dob",
      "country",
      "city",
      "chiefComplaint",
      "genderPreference",
    ],
    [],
  );

  // Define nested fields
  const nestedFields = {
    phone: ["countryCode", "phoneNumber"],
    isPatientFields: ["isPatient"],
  };

  // Define conditional fields - only require patientRelation if isPatient is false
  const conditionalFields = {
    "isPatientFields.patientRelation": (values: any) =>
      !values.isPatientFields?.isPatient,
  };

  useEffect(() => {
    // Only run this if the language has changed and the form-ui is initialized
    if (prevLanguageRef.current !== language && form) {
      // Preserve form-ui values when language changes
      preserveFormValues(form, language);

      // Update the ref
      prevLanguageRef.current = language;
    }
  }, [language, form]);

  // Watch form-ui values to determine if form-ui is valid
  useEffect(() => {
    const subscription = form.watch(() => {
      // Check form-ui validity after a short delay to allow for validation
      setTimeout(() => {
        const isValid = validateFormCompleteness(form, requiredFields);
        setIsFormValid(isValid);
      }, 100);
    });

    return () => subscription.unsubscribe();
  }, [form, requiredFields]);

  if (loading) {
    return <LoadingState language={language} />;
  }

  return (
    <FormProvider {...form}>
      <FormProgressTracker
        requiredFields={requiredFields}
        nestedFields={nestedFields}
        conditionalFields={conditionalFields}
      />

      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        {/* Patient Information Fields */}
        <PatientInfoFields form={form} language={language} />

        {/* Chief Complaint Field */}
        <ChiefComplaintField form={form} language={language} />

        {/* Current Medications Field */}
        <CurrentMedicationsField form={form} language={language} />

        {/* Allergies Field */}
        <AllergiesField form={form} language={language} />

        {/* Gender Preference Field */}
        <GenderPreferenceField form={form} language={language} />

        {/* Patient Relation Fields */}
        <PatientRelationFields
          form={form}
          language={language}
          isPatient={isPatient}
          setIsPatient={setIsPatient}
        />

        {/* Submit Button */}
        <SubmitButton
          language={language}
          submitting={submitting}
          isFormValid={isFormValid}
        />
      </form>

      {/* Patient ID Accordion */}
      <PatientIdAccordion patientId={patientId} />
    </FormProvider>
  );
}
