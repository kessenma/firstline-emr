// apps/web/components/form/MultiSelector.tsx
"use client";

import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Info } from "lucide-react";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useState,
} from "react";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string[];
  onValueChange: (value: string[]) => void;
  limit?: number; // New prop to limit selections
}

const MultiSelectContext = createContext<{
  value: string[];
  onValueChange: (value: string[]) => void;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  limit?: number; // Add limit to context
  isLimitReached: boolean; // Add helper for checking if limit is reached
}>({
  value: [],
  onValueChange: () => {},
  inputValue: "",
  setInputValue: () => {},
  isLimitReached: false,
});

const useMultiSelect = () => {
  return useContext(MultiSelectContext);
};

const MultiSelector = forwardRef<HTMLDivElement, MultiSelectorProps>(
  ({ className, children, value, onValueChange, limit, ...props }, ref) => {
    const [inputValue, setInputValue] = useState("");
    // Calculate if limit is reached
    const isLimitReached = limit !== undefined && value.length >= limit;

    return (
      <MultiSelectContext.Provider
        value={{
          value,
          onValueChange,
          inputValue,
          setInputValue,
          limit,
          isLimitReached,
        }}
      >
        <div ref={ref} className={cn("relative", className)} {...props}>
          {children}
        </div>
      </MultiSelectContext.Provider>
    );
  },
);

MultiSelector.displayName = "MultiSelector";

const MultiSelectorTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { value, limit } = useMultiSelect();
  return (
    <PopoverTrigger asChild>
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-between w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs ring-1 ring-inset ring-border hover:ring-2 hover:ring-inset",
          className,
        )}
        {...props}
      >
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-1 mr-2">
            {value.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
            {limit && (
              <span className="text-xs text-muted-foreground ml-1 self-center">
                {value.length}/{limit}
              </span>
            )}
          </div>
        ) : (
          children
        )}
        <ChevronsUpDown className="h-4 w-4 ml-2 shrink-0" />
      </button>
    </PopoverTrigger>
  );
});

MultiSelectorTrigger.displayName = "MultiSelectorTrigger";

const MultiSelectorInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const { inputValue, setInputValue } = useMultiSelect();
  return (
    <input
      ref={ref}
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      className={cn(
        "w-full border border-border bg-background px-3 py-2 text-sm rounded-md shadow-xs ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset",
        className,
      )}
      {...props}
    />
  );
});

MultiSelectorInput.displayName = "MultiSelectorInput";

const MultiSelectorContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isLimitReached, limit, value } = useMultiSelect();

  return (
    <PopoverContent className={cn("w-64", className)} {...props}>
      {isLimitReached && (
        <div className="p-2 text-xs flex items-center text-warning bg-warning/10 rounded-sm mb-2">
          <Info className="h-3 w-3 mr-1" />
          Maximum of {limit} {limit === 1 ? "selection" : "selections"} reached
        </div>
      )}
      {children}
    </PopoverContent>
  );
});

MultiSelectorContent.displayName = "MultiSelectorContent";

const MultiSelectorList = forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, children }, ref) => {
  return (
    <ScrollArea className="h-[200px]">
      <ul ref={ref} className={cn("p-1 text-sm", className)}>
        {children}
      </ul>
    </ScrollArea>
  );
});

MultiSelectorList.displayName = "MultiSelectorList";

const MultiSelectorItem = forwardRef<
  HTMLLIElement,
  { value: string } & React.LiHTMLAttributes<HTMLLIElement>
>(({ className, value, children, ...props }, ref) => {
  const {
    value: selectedValues,
    onValueChange,
    setInputValue,
    isLimitReached,
  } = useMultiSelect();

  const isSelected = selectedValues.includes(value);
  // Determine if this item is disabled (when limit is reached and item is not already selected)
  const isDisabled = isLimitReached && !isSelected;

  const handleSelect = useCallback(() => {
    // Allow deselection even if limit is reached
    if (isSelected) {
      const newValues = selectedValues.filter((v) => v !== value);
      onValueChange(newValues);
    }
    // Only allow selection if limit is not reached
    else if (!isLimitReached) {
      onValueChange([...selectedValues, value]);
    }
    setInputValue("");
  }, [
    value,
    selectedValues,
    onValueChange,
    setInputValue,
    isSelected,
    isLimitReached,
  ]);

  return (
    <li
      ref={ref}
      {...props}
      onClick={handleSelect}
      className={cn(
        "cursor-pointer px-2 py-1.5 text-sm rounded-sm flex items-center justify-between",
        className,
        isSelected && "bg-accent text-accent-foreground",
        isDisabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {children}
      {isSelected && <Check className="h-4 w-4 opacity-100" />}
    </li>
  );
});

MultiSelectorItem.displayName = "MultiSelectorItem";

export {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
};
