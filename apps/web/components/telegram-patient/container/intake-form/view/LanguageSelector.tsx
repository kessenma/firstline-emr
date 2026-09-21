// apps/web/components/telegram-patient/container/intake-form/view/LanguageSelector.tsx
"use client"
import { translations, type LanguageString } from "@/components/telegram-patient/container/intake-form/patient-form-translations"

interface LanguageSelectorProps {
    currentLanguage: string
    onLanguageChange: (language: LanguageString) => void
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
    const languages: LanguageString[] = ["English", "Arabic", "Farsi", "Pashto", "Turkish", "Urdu", "Spanish", "French"]

    return (
        <div className="flex flex-wrap justify-center space-x-2 space-y-2 border-b pb-2 w-full px-2">
            <div className="w-full text-center mb-1 sr-only">Language Selection</div>
            {languages.map((lang) => (
                <button
                    key={lang}
                    className={`px-2 py-1 ${currentLanguage === lang ? "border-b-2 border-primary font-medium" : ""}`}
                    onClick={() => onLanguageChange(lang)}
                >
                    {translations.languageButtons[lang]}
                </button>
            ))}
        </div>
    )
}

