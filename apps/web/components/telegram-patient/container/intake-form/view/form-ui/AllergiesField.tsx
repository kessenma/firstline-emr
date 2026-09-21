// apps/web/components/telegram-patient/container/intake-form/view/form-ui/AllergiesField.tsx
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

interface AllergiesFieldProps {
  form: UseFormReturn<any>;
  language: string;
}

export function AllergiesField({ form, language }: AllergiesFieldProps) {
  const safeLanguage = languageEnumToString(language);
  const [hasAllergies, setHasAllergies] = useState<string | null>(null);

  // Get the translated options
  const options = translations.allergies.options[safeLanguage];
  const yesOption = options[0]; // "Yes" in the current language
  const noAllergyOption = options[1]; // "No allergies" in the current language

  // Initialize state from form value
  useEffect(() => {
    const allergies = form.getValues("allergies");
    if (allergies && allergies.trim() !== "" && allergies !== "No allergies") {
      setHasAllergies(yesOption);
    } else if (allergies === "No allergies") {
      setHasAllergies(noAllergyOption);
    }
  }, [form, yesOption, noAllergyOption]);

  const handleRadioChange = (value: string) => {
    setHasAllergies(value);

    if (value === noAllergyOption) {
      form.setValue("allergies", "No allergies");
    } else {
      // Clear so user can type their allergies
      form.setValue("allergies", "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Radio Card for Yes/No allergies */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">
          {translations.allergies.label[safeLanguage]}
        </Label>
        <RadioCard.Root
          value={hasAllergies || ""}
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

      {/* Conditional Text Area for listing allergies */}
      {hasAllergies === yesOption && (
        <div className="space-y-2">
          <Textarea
            placeholder={translations.allergies.placeholder[safeLanguage]}
            value={form.watch("allergies") || ""}
            onChange={(e) => {
              form.setValue("allergies", e.target.value);
            }}
            className="min-h-[100px] rounded-md border-border focus:ring-0 focus:border-border shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
