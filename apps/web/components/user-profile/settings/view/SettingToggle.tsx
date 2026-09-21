// apps/web/components/user-profile/settings/view/SettingToggle.tsx
"use client"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Info } from "lucide-react"
import type { ReactNode } from "react"

type SettingToggleProps = {
    title: string
    icon: ReactNode
    offIcon?: ReactNode // New prop for the icon to show when toggle is off
    description: string
    isChecked: boolean
    onToggle: () => void
    isDescriptionVisible: boolean
    onToggleDescription: () => void
}

export default function SettingToggle({
                                          title,
                                          icon,
                                          offIcon,
                                          description,
                                          isChecked,
                                          onToggle,
                                          isDescriptionVisible,
                                          onToggleDescription,
                                      }: SettingToggleProps) {
    return (
        <div className="space-y-2 pl-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleDescription}>
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {!isChecked && offIcon}
                    <Switch checked={isChecked} onCheckedChange={onToggle} />
                </div>
            </div>
            {isDescriptionVisible && <p className="text-sm text-muted-foreground pl-10 pr-10">{description}</p>}
        </div>
    )
}

