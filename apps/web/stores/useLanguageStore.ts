// apps/web/stores/useLanguageStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LanguageString } from "@/components/telegram-patient/container/intake-form/patient-form-translations"

interface LanguageState {
    language: LanguageString
    setLanguage: (language: LanguageString) => void
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            language: "English" as LanguageString,
            setLanguage: (language: LanguageString) => set({ language }),
        }),
        {
            name: 'language-storage',
        }
    )
)
