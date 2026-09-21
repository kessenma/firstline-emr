"use client";

import { cn } from "@/utils/classNames";
import { Check } from "lucide-react";

interface FilterCardGridProps {
  label: string;
  options: readonly string[];
  /** `undefined` means none selected — same contract as mobile's FilterPillGrid. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function FilterPillRow({
  label,
  options,
  value,
  onChange,
}: FilterCardGridProps) {
  // Smart layout based on option count and text length (adapted from RadioCardFormField)
  const avgLength =
    options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
  const maxLength = Math.max(...options.map((opt) => opt.length));
  const optionCount = options.length;

  const getLayoutClasses = () => {
    // Short options with 2-4 items: 2 columns
    if (optionCount <= 4 && maxLength < 16) {
      return "grid grid-cols-2 gap-1.5";
    }
    // Medium: 2 columns for up to ~6 items or moderate text
    if (optionCount <= 6 && avgLength < 16) {
      return "grid grid-cols-2 gap-1.5";
    }
    // Many items or long text: 2-col wrapping grid
    return "grid grid-cols-2 gap-1.5";
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={getLayoutClasses()}>
        {options.map((option) => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              onClick={() => onChange(isSelected ? undefined : option)}
              className={cn(
                "relative rounded-lg px-3 py-2 text-left transition-all duration-150",
                "border text-sm",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-background text-foreground hover:border-primary/50 cursor-pointer",
              )}
            >
              <span className="block truncate pr-5">{option}</span>
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
