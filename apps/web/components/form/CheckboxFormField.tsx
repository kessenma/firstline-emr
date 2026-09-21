"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxFormFieldProps {
  name: string;
  label: string;
  className?: string;
  required?: boolean;
}

export function CheckboxFormField({
  name,
  label,
  className,
  required = false,
}: CheckboxFormFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      defaultValue={false}
      rules={{ required }}
      render={({ field }) => (
        <div className={`flex items-center space-x-2 ${className || ""}`}>
          <Checkbox
            id={name}
            checked={field.value === true}
            onCheckedChange={(checked) => {
              field.onChange(checked === true);
            }}
          />
          <Label htmlFor={name} className="font-normal cursor-pointer">
            {label}
          </Label>
        </div>
      )}
    />
  );
}
