"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CountryCodesList } from "@/data/countries.enum"; // Import directly from your enum file

// Format phone number as (xxx) xxx-xxxx for US numbers
const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, "");

  // Format based on length
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

// Remove formatting from phone number
const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, "");
};

export function PhoneFormField({
  form,
  fieldName,
  fieldLabel,
  defaultValue,
  countryCodeError,
  classNames,
  placeholder,
  required = false,
}: {
  form: any;
  fieldName: string;
  fieldLabel: string;
  defaultValue?: { countryCode: string; phoneNumber: string };
  countryCodeError?: string;
  classNames?: string;
  placeholder?: string;
  required?: boolean;
}) {
  // Get the current form value and watch for changes
  const currentValue = form.watch(fieldName);

  const [countryCode, setCountryCode] = useState<string>(() => {
    // Initialize with priority: defaultValue > currentValue > fallback
    return defaultValue?.countryCode ||
           currentValue?.countryCode ||
           "+972";
  });

  const [phoneNumber, setPhoneNumber] = useState(() => {
    return defaultValue?.phoneNumber ||
           currentValue?.phoneNumber ||
           "";
  });

  const [displayPhone, setDisplayPhone] = useState(() => {
    const phone = defaultValue?.phoneNumber || currentValue?.phoneNumber || "";
    return phone ? formatPhoneNumber(phone) : "";
  });

  const handleCountryCodeChange = (value: string) => {
    setCountryCode(value);

    // Clear the error if a country code is selected
    if (value) {
      form.clearErrors(fieldName);
    }

    // Update form value with both country code and phone number
    form.setValue(
      fieldName,
      {
        countryCode: value,
        phoneNumber: phoneNumber,
      },
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const rawValue = unformatPhoneNumber(inputValue); // Strip all non-numeric characters

    // Limit to 10 digits for US numbers
    const limitedValue = rawValue.slice(0, 10);

    setPhoneNumber(limitedValue);
    setDisplayPhone(formatPhoneNumber(limitedValue));

    if (countryCode) {
      form.setValue(
        fieldName,
        {
          countryCode,
          phoneNumber: limitedValue,
        },
        { shouldValidate: true },
      );
    }
  };

  const handleValidation = () => {
    // Ensure that a country code is selected
    if (!countryCode) {
      return false;
    }
    return true;
  };

  // Initialize form value on mount if not set
  useEffect(() => {
    const formValue = form.getValues(fieldName);

    // If form doesn't have a value or countryCode is missing, set it
    if (!formValue || !formValue.countryCode) {
      form.setValue(
        fieldName,
        {
          countryCode: countryCode,
          phoneNumber: phoneNumber,
        },
        { shouldValidate: false, shouldDirty: false }
      );
    }
  }, []);

  // Sync state when form value changes externally
  useEffect(() => {
    if (currentValue) {
      if (currentValue.countryCode && currentValue.countryCode !== countryCode) {
        setCountryCode(currentValue.countryCode);
      }
      if (currentValue.phoneNumber !== phoneNumber) {
        setPhoneNumber(currentValue.phoneNumber || "");
        setDisplayPhone(
          currentValue.phoneNumber ? formatPhoneNumber(currentValue.phoneNumber) : ""
        );
      }
    }
  }, [currentValue]);

  return (
    <div className={classNames || "w-full"}>
      <FormField
        control={form.control}
        name={fieldName}
        rules={{ required }}
        render={({ field }) => (
          <FormItem>
            {fieldLabel && (
              <FormLabel className="text-muted-foreground text-sm">
                {fieldLabel}
              </FormLabel>
            )}
            <div className="flex">
              {/* Country Code Dropdown with new UI */}
              <Select
                value={countryCode}
                onValueChange={handleCountryCodeChange}
                onOpenChange={() => handleValidation()}
              >
                <SelectTrigger className="w-[80px] rounded-r-none shadow-md border-border focus:ring-0 focus:border-primary">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {CountryCodesList.map((code: string) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Phone Number Input with new UI */}
              <Input
                type="tel"
                value={displayPhone}
                onChange={(e) => {
                  field.onChange(e);
                  handlePhoneNumberChange(e);
                }}
                className="flex-1 rounded-l-none shadow-md border-border focus:ring-0 focus:border-primary"
                placeholder={placeholder || "(555) 555-5555"}
              />
            </div>
            {/* Show error message if country code is not selected */}
            {countryCodeError && (
              <p className="text-destructive text-sm">{countryCodeError}</p>
            )}
          </FormItem>
        )}
      />
    </div>
  );
}
