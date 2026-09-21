// apps/web/components/telegram-patient/container/intake-form/view/form-ui/GenderPreferenceField.tsx
"use client"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { languageEnumToString, translations } from "../../patient-form-translations"
import type { UseFormReturn } from "react-hook-form"

interface GenderPreferenceFieldProps {
    form: UseFormReturn<any>
    language: string
}

export function GenderPreferenceField({ form, language }: GenderPreferenceFieldProps) {
    // Convert language to a safe type first
    const safeLanguage = languageEnumToString(language)

    // Get gender preference options with proper typing
    const getGenderOptions = () => {
        const options = translations.genderPreference.options[safeLanguage]
        return options || translations.genderPreference.options.English
    }

    return (
        <div className="space-y-3">
            <Label htmlFor="GenderPreference" className="text-dark-blue text-sm">
                {translations.genderPreference.label[safeLanguage]}
            </Label>
            <RadioGroup
                defaultValue={form.watch("genderPreference") || "female"}
                onValueChange={(value) => form.setValue("genderPreference", value)}
                className="space-y-2"
            >
                {getGenderOptions().map((option: string) => (
                    <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`gender-${option}`} />
                        <Label htmlFor={`gender-${option}`} className="text-dark-blue">
                            {option}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    )
}
