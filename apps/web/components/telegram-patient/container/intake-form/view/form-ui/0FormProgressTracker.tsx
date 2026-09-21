// apps/web/form-ui/telegram-patient/intake-form-ui/0FormProgressTracker.tsx
"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { TelegramProgressBar } from "./TelegramProgressBar";
import { usePatientFormStore } from "@/stores/usePatientFormStore";

interface FormProgressTrackerProps {
  requiredFields: string[];
  nestedFields?: Record<string, string[]>;
  conditionalFields?: Record<string, (values: any) => boolean>;
}

export function FormProgressTracker({
  requiredFields,
  nestedFields = {},
  conditionalFields = {},
}: FormProgressTrackerProps) {
  const [progress, setProgress] = useState(0);
  const { watch, formState } = useFormContext();
  const formValues = watch();
  const { errors } = formState;

  // Get the submitting state from the store
  const { submitting } = usePatientFormStore();

  useEffect(() => {
    // Calculate how many required fields are filled
    let filledFields = 0;
    let totalFields = requiredFields.length;

    // Check regular fields
    requiredFields.forEach((field) => {
      if (formValues[field] && !errors[field]) {
        filledFields++;
      }
    });

    // Check nested fields
    Object.entries(nestedFields).forEach(([parent, children]) => {
      children.forEach((child) => {
        totalFields++;
        const path = `${parent}.${child}`;
        const value = parent
          .split(".")
          .reduce((obj, key) => obj?.[key], formValues);

        if (value?.[child] && !errors[parent]?.message) {
          filledFields++;
        }
      });
    });

    // Check conditional fields
    Object.entries(conditionalFields).forEach(([field, condition]) => {
      if (condition(formValues)) {
        totalFields++;
        if (formValues[field] && !errors[field]) {
          filledFields++;
        }
      }
    });

    // Calculate percentage
    const calculatedProgress = Math.round((filledFields / totalFields) * 100);

    // If form-ui is submitting, set progress to 100%
    if (submitting) {
      setProgress(100);
    } else {
      setProgress(calculatedProgress);
    }
  }, [
    formValues,
    errors,
    requiredFields,
    nestedFields,
    conditionalFields,
    submitting,
  ]);

  return (
    <div className="sticky top-0 z-10 shadow-xs px-4 py-2">
      <TelegramProgressBar progress={progress} />
    </div>
  );
}
