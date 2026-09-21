"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioCard } from "@/components/ui/radio-card"
import { cn } from "@/utils/classNames"

interface RadioCardFormFieldProps {
  name: string
  label?: string
  options: string[]
  required?: boolean
  className?: string
}

/**
 * Smart RadioCardFormField that automatically determines layout based on:
 * - Number of options
 * - Length of option text
 *
 * Layout logic:
 * - 2-3 short options (< 12 chars): Horizontal flex
 * - 3-4 medium options: 2-column grid that wraps
 * - 5+ options or long text: Vertical stack
 */
export function RadioCardFormField({
  name,
  label,
  options,
  required = false,
  className,
}: RadioCardFormFieldProps) {
  const form = useFormContext()

  // Calculate average length of options
  const avgLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length
  const maxLength = Math.max(...options.map(opt => opt.length))
  const optionCount = options.length

  // Determine layout based on option count and text length
  const getLayoutClasses = () => {
    // Short options (< 12 chars avg, < 20 max) with 2-3 options: side by side
    if (optionCount <= 3 && avgLength < 12 && maxLength < 20) {
      return "flex gap-3"
    }

    // Medium options or 3-4 items: 2-column grid
    if (optionCount <= 4 && maxLength < 30) {
      return "grid grid-cols-1 sm:grid-cols-2 gap-3"
    }

    // Many options or long text: vertical stack
    return "flex flex-col gap-3"
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem id={name} tabIndex={-1} className={cn("space-y-3", className)}>
          {label && (
            <FormLabel className="text-muted-foreground text-sm">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <RadioCard.Root
            value={field.value || ""}
            onValueChange={field.onChange}
            className={getLayoutClasses()}
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
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
