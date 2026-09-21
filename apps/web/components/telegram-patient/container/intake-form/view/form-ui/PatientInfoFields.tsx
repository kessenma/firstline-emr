// apps/web/components/telegram-patient/container/intake-form/view/form-ui/PatientInfoFields.tsx
import { Label } from "@/components/ui/label";
import { TextFormField } from "@/components/ui/TextFormField";
import { PhoneFormField } from "@/components/form/PhoneFormField";
import { DatePickerFormField } from "@/components/form/DatePickerFormField";
import { SelectFormField } from "@/components/form/SelectFormField";
import {
  getCountryOptions,
  translations,
  languageEnumToString,
} from "../../patient-form-translations";
import type { UseFormReturn } from "react-hook-form";

interface PatientInfoFieldsProps {
  form: UseFormReturn<any>;
  language: string;
}

export function PatientInfoFields({ form, language }: PatientInfoFieldsProps) {
  // Convert language to a safe type
  const safeLanguage = languageEnumToString(language);

  return (
    <>
      {/* First Name */}
      <div className="space-y-2">
        <Label htmlFor="firstName" className="text-sm text-primary">
          {translations.firstName[safeLanguage]}
        </Label>
        <TextFormField
          fieldName="firstName"
          fieldLabel=""
          placeholder={``}
          error={form.formState.errors.firstName?.message as string | undefined}
          className="rounded-md border-border shadow-xl focus:ring-0 focus:border-border"
        />
      </div>

      {/* Last Name */}
      <div className="space-y-2">
        <Label htmlFor="lastName" className="text-sm text-primary">
          {translations.lastName[safeLanguage]}
        </Label>
        <TextFormField
          fieldName="lastName"
          fieldLabel=""
          placeholder=""
          error={form.formState.errors.lastName?.message as string | undefined}
          className="rounded-md border-border shadow-xl focus:ring-0 focus:border-border"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2 shadow-xl">
        <Label htmlFor="phone" className="text-sm text-primary">
          {translations.phone[safeLanguage]}
        </Label>
        <PhoneFormField
          form={form}
          fieldName="phone"
          fieldLabel=""
          placeholder="### - ### - ####"
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob" className="text-sm text-primary">
          {translations.dob[safeLanguage]}
        </Label>
        <div className={"shadow-xl"}>
          <DatePickerFormField name="dob" label="" type="past" />
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm text-primary">
          {translations.country[safeLanguage]}
        </Label>
        <SelectFormField
          classNames={"shadow-xl"}
          selectOptions={getCountryOptions(language)}
          form={form}
          fieldName="country"
          fieldLabel=""
        />
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="city" className="text-sm text-primary">
          {translations.city[safeLanguage]}
        </Label>
        <TextFormField
          fieldName="city"
          fieldLabel=""
          placeholder=""
          error={form.formState.errors.city?.message as string | undefined}
          className="rounded-md border-border shadow-xl focus:ring-0 focus:border-border"
        />
      </div>
    </>
  );
}
