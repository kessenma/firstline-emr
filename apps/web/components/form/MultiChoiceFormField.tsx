// apps/web/components/form/MultiChoiceFormField.tsx
"use client"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import {
    MultiSelector,
    MultiSelectorTrigger,
    MultiSelectorInput,
    MultiSelectorContent,
    MultiSelectorList,
    MultiSelectorItem,
} from "./MultiSelector"
import {
    Popover,
    PopoverTrigger,
    PopoverContent
} from "@/components/ui/popover"

interface MultiChoiceFormFieldProps {
    fieldName: string
    fieldLabel: string
    choices: string[]
    limit?: number // New prop to limit selections
    value?: string[]
    onChange?: (value: string[]) => void
    disabled?: boolean
    className?: string
}

export function MultiChoiceFormField({ fieldName, fieldLabel, choices, limit, value: propValue, onChange: propOnChange, disabled = false, className }: MultiChoiceFormFieldProps) {
    const form = useFormContext()

    const renderSelector = (currentValue: string[], onValueChange: (newValues: string[]) => void) => {
        if (disabled) {
            return (
                <div className={cn("w-full p-2 border rounded-md bg-muted text-muted-foreground cursor-not-allowed", className)}>
                    {currentValue && currentValue.length > 0
                        ? currentValue.join(", ")
                        : `Select ${fieldLabel}${limit ? ` (Max ${limit})` : ''}`
                    }
                </div>
            )
        }

        return (
            <Popover>
                <MultiSelector
                    value={currentValue}
                    onValueChange={(newValues: string[]) => {
                        // Only update if we're removing items or if we haven't hit the limit
                        if (!limit || newValues.length <= limit) {
                            onValueChange(newValues)
                            if (form) {
                                form.trigger(fieldName)
                            }
                            if (propOnChange) {
                                propOnChange(newValues)
                            }
                        }
                    }}
                    limit={limit}
                >
                    <MultiSelectorTrigger className={cn("w-full", className)}>
                        <MultiSelectorInput
                            placeholder={
                                fieldLabel === "Select Which Countries In Which You Would Like to Consult Patients"
                                    ? "Select Countries"
                                    : `Select ${fieldLabel}${limit ? ` (Max ${limit})` : ''}`
                            }
                            className={cn(
                                "w-full text-left justify-between",
                                currentValue && currentValue.length > 0 ? "" : "text-muted-foreground",
                            )}
                        />
                    </MultiSelectorTrigger>
                    <MultiSelectorContent className="w-full sm:w-[350px] md:w-[450px]">
                        <MultiSelectorList>
                            {choices.map((choice, index) => (
                                <MultiSelectorItem key={index} value={choice}>
                                    {choice}
                                </MultiSelectorItem>
                            ))}
                        </MultiSelectorList>
                    </MultiSelectorContent>
                </MultiSelector>
            </Popover>
        )
    }

    if (form) {
        return (
            <FormField
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>{fieldLabel}</FormLabel>
                        <FormControl>
                            {renderSelector(field.value || [], field.onChange)}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )
    }

    // Fallback for cases where FormProvider is not available
    return (
        <div className="flex flex-col">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">
                {fieldLabel}
            </label>
            {renderSelector(propValue || [], propOnChange || (() => {}))}
        </div>
    )
}
