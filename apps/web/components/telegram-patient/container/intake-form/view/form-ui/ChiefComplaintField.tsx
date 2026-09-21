// apps/web/components/telegram-patient/container/intake-form/view/form-ui/ChiefComplaintField.tsx
import { Label } from "@/components/ui/label"
import { TextFormField } from "@/components/ui/TextFormField"
import { translations, languageEnumToString } from "../../patient-form-translations"
import type { UseFormReturn } from "react-hook-form"

interface ChiefComplaintFieldProps {
    form: UseFormReturn<any>
    language: string
}

export function ChiefComplaintField({ form, language }: ChiefComplaintFieldProps) {
    // Convert language to a safe type
    const safeLanguage = languageEnumToString(language)

    return (
        <div className="space-y-2">
            <Label htmlFor="chiefComplaint" className="text-primary text-sm">
                {translations.chiefComplaint[safeLanguage]}
            </Label>
            <TextFormField
                fieldName="chiefComplaint"
                fieldLabel=""
                placeholder=""
                multiline={true}
                rows={4}
                error={form.formState.errors.chiefComplaint?.message as string | undefined}
                className="rounded-md border-border focus:ring-0 focus:border-primary shadow-xl"
            />
        </div>
    )
}

