// apps/web/components/telegram-patient/container/existing-patient/SubmittedPatientView.tsx
"use client"

import { CopyButton } from "@/components/ui/CopyButton"
import { type LanguageString, translations } from "./../intake-form/patient-form-translations"

type SubmittedPatientViewProps = {
    telegramChatId: string
    patientId: string
    patientData: {
        firstName?: string
        lastName?: string
    }
    language: LanguageString
}

export function SubmittedPatientView({ patientId, patientData, language }: SubmittedPatientViewProps) {
    return (
        <>
            <p className="text-center text-lg">{translations.submittedMessage[language]}</p>

            {/* Patient ID Section with Copy Button */}
            <div className="flex items-center justify-center space-x-2 mt-2">
                <p className="text-lg font-semibold text-muted-foreground">
                    Patient ID: <span className="text-foreground">{patientId}</span>
                </p>
                <CopyButton 
                    textToCopy={patientId}
                    label="Patient ID"
                    variant="ghost"
                    size="sm"
                    className="p-1 hover:text-accent"
                />
            </div>

            {/* Show Patient Name if available */}
            {patientData?.firstName && patientData?.lastName && (
                <p className="text-center text-lg font-medium text-muted-foreground">
                    Name: {patientData.firstName} {patientData.lastName}
                </p>
            )}
        </>
    )
}