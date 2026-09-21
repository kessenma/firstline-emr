// apps/web/components/telegram-patient/container/intake-form/view/form-ui/CurrentMedicationsField.tsx
"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioCard } from "@/components/ui/radio-card";
import { Textarea } from "@/components/ui/textarea";
import {
  translations,
  languageEnumToString,
} from "../../patient-form-translations";
import type { UseFormReturn } from "react-hook-form";

interface CurrentMedicationsFieldProps {
  form: UseFormReturn<any>;
  language: string;
}

export function CurrentMedicationsField({
  form,
  language,
}: CurrentMedicationsFieldProps) {
  const safeLanguage = languageEnumToString(language);
  const [hasMedications, setHasMedications] = useState<string | null>(null);

  // Get the translated options
  const options = translations.currentMedications.options[safeLanguage];
  const yesOption = options[0]; // "Yes" in the current language
  const noOption = options[1]; // "No" in the current language

  // Initialize state from form value
  useEffect(() => {
    const currentMeds = form.getValues("currentMeds");
    if (currentMeds && currentMeds.trim() !== "") {
      setHasMedications(yesOption);
    }
  }, [form, yesOption]);

  const handleRadioChange = (value: string) => {
    setHasMedications(value);

    // If "No" is selected, clear the medications field
    if (value === noOption) {
      form.setValue("currentMeds", "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Radio Card for Yes/No */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">
          {translations.currentMedications.label[safeLanguage]}
        </Label>
        <RadioCard.Root
          value={hasMedications || ""}
          onValueChange={handleRadioChange}
          className="flex gap-3"
        >
          {options.map((option) => (
            <RadioCard.Item
              key={option}
              value={option}
              className="flex-1"
            >
              <div className="text-center font-medium text-sm">
                {option}
              </div>
            </RadioCard.Item>
          ))}
        </RadioCard.Root>
      </div>

      {/* Conditional Text Area for Medications */}
      {hasMedications === yesOption && (
        <div className="space-y-2">
          <Textarea
            placeholder={translations.currentMedications.placeholder[safeLanguage]}
            value={form.watch("currentMeds") || ""}
            onChange={(e) => {
              form.setValue("currentMeds", e.target.value);
            }}
            className="min-h-[100px] rounded-md border-border focus:ring-0 focus:border-border shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
