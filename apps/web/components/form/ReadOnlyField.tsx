// apps/web/components/form/ReadOnlyField.tsx
import type { ReactNode } from "react"

interface Props {
    fieldName: string
    fieldLabel: string
    value: string
    /** Optional leading icon rendered before the value. */
    icon?: ReactNode
    className?: string
}

export default function ReadOnlyField({ fieldName, fieldLabel, value, icon, className }: Props) {
    const id = `${fieldName}-input`

    return (
        <div className={`my-2 ${className}`}>
            <div className="flex items-center">
                <label htmlFor={id} className="text-sm font-medium text-muted-foreground min-w-[100px] sm:min-w-[120px] mr-2">
                    {fieldLabel}:
                </label>
                <div
                    id={id}
                    className={`flex-1 py-2 px-3 bg-muted border border-border rounded-md text-foreground ${icon ? "flex items-center gap-2" : ""}`}
                >
                    {icon}
                    {value}
                </div>
            </div>
        </div>
    )
}
