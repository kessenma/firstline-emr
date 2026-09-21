// apps/web/components/ui/TextFormField.tsx
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useFormContext, Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Props {
    fieldName: string
    fieldLabel: string
    className?: string
    type?: string
    tooltip?: string
    showTooltip?: boolean
    onFocus?: () => void
    error?: string | React.ReactNode
    disabled?: boolean
    autoComplete?: string
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    multiline?: boolean
    rows?: number
    readOnly?: boolean
    onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    placeholder?: string
}

const TextFormField: React.FC<Props> = ({
                                            fieldName,
                                            fieldLabel,
                                            className,
                                            type = "text",
                                            tooltip,
                                            showTooltip,
                                            onFocus,
                                            onBlur,
                                            autoComplete,
                                            error,
                                            disabled,
                                            value,
                                            onChange,
                                            multiline,
                                            rows,
                                            readOnly,
                                            placeholder,
                                        }) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(!!value)
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const formContext = useFormContext()
    const id = `${fieldName}-input`

    useEffect(() => {
        setHasValue(!!value)

        // Adjust textarea height automatically based on content
        if (multiline && textareaRef.current) {
            textareaRef.current.style.height = "auto" // Reset height to auto
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px` // Set height to match content
        }
    }, [value, multiline])

    const handleFocus = () => {
        if (!readOnly) {
            setIsFocused(true)
            if (onFocus) onFocus()
        }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!readOnly) {
            setIsFocused(false)
            setHasValue(!!e?.target?.value)
            if (onBlur) onBlur(e)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!readOnly) {
            setHasValue(!!e.target.value)
            if (multiline && textareaRef.current) {
                textareaRef.current.style.height = "auto" // Reset height to auto
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px` // Set height to match content
            }
            if (onChange) onChange(e)
        }
    }

    // Convert any error object or complex type to a string
    const errorMessage = typeof error === "string" ? error : error ? "This field has an error" : ""

    // Helper to compute class names based on field value
    const getInputClassName = (fieldValue: string) => {
        const fieldHasValue = !!(value !== undefined ? value : fieldValue)
        return `w-full pt-4 pb-2 pl-2 pr-10 border rounded-md text-foreground shadow-md
            ${readOnly ? "bg-muted cursor-not-allowed hover:bg-muted" : "hover:border-primary"}
            ${isFocused ? "border-primary" : "border-border"}
            ${error ? "border-destructive" : ""}
            ${fieldHasValue && !readOnly ? "bg-white dark:bg-zinc-800" : "bg-background"}
            focus:ring-0 focus:border-border
            ${className || ""}`
    }

    const renderInput = ({ field }: any) => (
        <div className="w-full">
            <div className="relative">
                {multiline ? (
                    <Textarea
                        {...field}
                        ref={textareaRef}
                        onFocus={handleFocus}
                        onBlur={(e) => {
                            field.onBlur()
                            handleBlur(e)
                        }}
                        value={value !== undefined ? value : field.value}
                        onChange={(e) => {
                            field.onChange(e)
                            handleChange(e)
                        }}
                        id={id}
                        name={fieldName}
                        autoComplete={autoComplete}
                        className={`${getInputClassName(field.value)} resize-none`}
                        rows={rows || 4}
                        readOnly={readOnly}
                        disabled={disabled}
                        style={{ overflow: "hidden" }}
                        placeholder={placeholder}
                    />
                ) : (
                    <Input
                        {...field}
                        onFocus={handleFocus}
                        onBlur={(e) => {
                            field.onBlur()
                            handleBlur(e)
                        }}
                        value={value !== undefined ? value : field.value}
                        onChange={(e) => {
                            field.onChange(e)
                            handleChange(e)
                        }}
                        id={id}
                        name={fieldName}
                        autoComplete={autoComplete}
                        className={getInputClassName(field.value)}
                        readOnly={readOnly}
                        disabled={disabled}
                        placeholder={placeholder}
                        type={type}
                    />
                )}

                {fieldLabel && (
                    <label
                        htmlFor={id}
                        className={`absolute transition-all duration-200 ${
                            isFocused || hasValue || placeholder
                                ? "text-xs -top-2 left-2 bg-card px-1 text-muted-foreground"
                                : "text-sm top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
                        } ${error ? "text-destructive" : ""} pointer-events-none`}
                        style={{
                            transformOrigin: "left center",
                        }}
                    >
                        {fieldLabel}
                    </label>
                )}

                {showTooltip && tooltip && (
                    <div className="absolute left-0 bottom-full mt-2 w-full bg-muted text-foreground text-sm p-2 rounded shadow-lg z-10">
                        {tooltip}
                    </div>
                )}
            </div>
            {errorMessage && <p className="text-destructive text-sm mt-1">{errorMessage}</p>}
        </div>
    )

    if (formContext) {
        return <Controller name={fieldName} render={renderInput} />
    }

    return renderInput({
        field: { value: value || "", onChange: handleChange, onBlur: handleBlur },
    })
}

export { TextFormField }
