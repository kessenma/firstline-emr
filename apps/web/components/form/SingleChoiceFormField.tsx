"use client"

import { useState, useCallback } from "react"
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useFormContext, Controller } from "react-hook-form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SingleChoiceFormFieldProps {
    fieldName: string
    fieldLabel?: string
    choices: string[]
    value?: string
    onChange?: (value: string) => void
    disabled?: boolean
    className?: string
}

export function SingleChoiceFormField({
                                          fieldName,
                                          fieldLabel,
                                          choices,
                                          value: propValue,
                                          onChange: propOnChange,
                                          disabled = false,
                                          className,
                                      }: SingleChoiceFormFieldProps) {
    const formContext = useFormContext()
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Add a safety check for undefined choices
    const safeChoices = choices || ["Female", "Male", "No Preference"]

    const filteredChoices = safeChoices.filter((choice) => choice.toLowerCase().includes(searchQuery.toLowerCase()))

    const handleSelect = useCallback(
        (selectedChoice: string, fieldOnChange: (value: string) => void) => {
            fieldOnChange(selectedChoice)
            if (propOnChange) {
                propOnChange(selectedChoice)
            }
            setOpen(false)
        },
        [propOnChange],
    )

    const renderField = ({ field }: { field: { value: string; onChange: (value: string) => void } }) => (
        <FormItem className="flex flex-col">
            {fieldLabel && <FormLabel>{fieldLabel}</FormLabel>}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <FormControl>
                        <div
                            className={cn(
                                "w-full p-2 border rounded-md bg-background text-left flex justify-between items-center",
                                !field.value && "text-muted-foreground",
                                "min-h-[40px]",
                                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                                className,
                            )}
                            style={{
                                whiteSpace: "pre-wrap",
                                overflowWrap: "break-word",
                                wordWrap: "break-word",
                                maxHeight: "200px",
                                overflowY: "auto",
                            }}
                            onClick={!disabled ? () => setOpen(true) : undefined}
                            role="combobox"
                            aria-expanded={!disabled && open ? true : false}
                            aria-controls={`listbox-${fieldName}`}
                        >
                            <span>{field.value || `Select ${fieldLabel || "option"}`}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </div>
                    </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" id={`listbox-${fieldName}`}>
                    <div className="p-2">
                        {safeChoices.length >= 10 && (
                            <input
                                type="text"
                                placeholder={`Search ${fieldLabel?.toLowerCase() || "option"}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-2 border rounded-md mb-2"
                            />
                        )}
                        <ScrollArea className="h-72">
                            <ul className="space-y-1">
                                {filteredChoices.map((choice) => (
                                    <li
                                        key={choice}
                                        onClick={() => handleSelect(choice, field.onChange)}
                                        className={cn(
                                            "flex items-center p-2 rounded-md cursor-pointer hover:bg-muted",
                                            field.value === choice && "bg-muted",
                                        )}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", field.value === choice ? "opacity-100" : "opacity-0")} />
                                        {choice}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </div>
                </PopoverContent>
            </Popover>
            <FormMessage />
        </FormItem>
    )

    if (formContext) {
        return <Controller control={formContext.control} name={fieldName} render={renderField} />
    }

    // Fallback for cases where FormProvider is not available
    return renderField({ field: { value: propValue || "", onChange: propOnChange || (() => {}) } })
}
