// apps/web/components/user-profile/ProfileField.tsx
"use client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Tooltip from "@/components/form/Tooltip"
import { useState } from "react"
import { FieldError } from "react-hook-form"

interface ProfileFieldProps {
    label: string
    value?: string
    isEditing: boolean
    fieldName?: string
    register?: any
    email?: string
    error?: FieldError | string
}

export function ProfileField({ label, value, isEditing, fieldName, register, email, error }: ProfileFieldProps) {
    const [isHovered, setIsHovered] = useState(false)
    const tooltipMessage = label === "Account Type" ? formatTooltipMessage(email || "") : ""

    function formatTooltipMessage(email: string) {
        return `If you need to update your account type, please contact an admin with the email address you signed up with: (${email})`
    }

    if (!isEditing) {
        return (
            <div>
                <Label className="font-medium">{label}</Label>
                <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="w-fit">
                    <Tooltip tooltipText={tooltipMessage} showTooltip={isHovered && label === "Account Type"}>
                        <p className="mt-1 cursor-help">{value || "N/A"}</p>
                    </Tooltip>
                </div>
            </div>
        )
    }

    if (fieldName) {
        return (
            <div>
                <Label className="font-medium" htmlFor={fieldName}>
                    {label}
                </Label>
                <Input
                    id={fieldName}
                    {...(register && fieldName ? register(fieldName) : {})}
                    defaultValue={value}
                    className="mt-1"
                />
                {error && (
                    <p className="text-sm text-destructive mt-1">
                        {typeof error === "string" ? error : error.message}
                    </p>
                )}
            </div>
        )
    }

    return null
}

