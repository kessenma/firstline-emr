// apps/web/components/telegram-patient/container/intake-form/view/form-ui/PatientRelationFields.tsx
"use client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TextFormField } from "@/components/ui/TextFormField";
import {
  translations,
  languageEnumToString,
} from "../../patient-form-translations";
import type { UseFormReturn } from "react-hook-form";

interface PatientRelationFieldsProps {
  form: UseFormReturn<any>;
  language: string;
  isPatient: boolean;
  setIsPatient: (value: boolean) => void;
}

export function PatientRelationFields({
  form,
  language,
  isPatient,
  setIsPatient,
}: PatientRelationFieldsProps) {
  // Convert language to a safe type
  const safeLanguage = languageEnumToString(language);

  // Get error message for nested field
  const getNestedErrorMessage = (fieldPath: string) => {
    const path = fieldPath.split(".");
    let error = form.formState.errors;

    for (const key of path) {
      if (!error[key]) return undefined;
      error = error[key] as any;
    }

    return error.message as string | undefined;
  };

  return (
    <>
      {/* Is Patient Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isPatientCheckbox"
          checked={form.watch("isPatientFields.isPatient")}
          onCheckedChange={(checked) => {
            const isChecked = checked === true;
            form.setValue("isPatientFields.isPatient", isChecked);
            setIsPatient(isChecked);

            // If checked, clear the patient relation field
            if (isChecked) {
              form.setValue("isPatientFields.patientRelation", "");
            }

            // Trigger validation to update progress
            form.trigger("isPatientFields");
          }}
        />
        <Label htmlFor="isPatientCheckbox" className="text-sm text-primary">
          {translations.isPatient[safeLanguage]}
        </Label>
      </div>

      {/* Patient Relation */}
      {!isPatient && (
        <div className="space-y-2">
          <Label htmlFor="patientRelation" className="text-primary text-sm">
            {translations.patientRelation[safeLanguage]}
          </Label>
          <TextFormField
            fieldName="isPatientFields.patientRelation"
            fieldLabel=""
            placeholder="Enter your relation to the patient"
            error={getNestedErrorMessage("isPatientFields.patientRelation")}
            className="rounded-md border-border focus:ring-0 focus:border-border shadow-xl"
            onChange={(e) => {
              // Update the form-ui value
              form.setValue("isPatientFields.patientRelation", e.target.value);
              // Trigger validation to update progress
              form.trigger("isPatientFields");
            }}
          />
        </div>
      )}
    </>
  );
}
