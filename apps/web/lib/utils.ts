// apps/web/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Countries, CountriesArabic, CountriesFarsi, CountriesPashto } from "@/data/countries.enum"
import { Languages, LanguagesArabic, LanguagesFarsi, LanguagesPashto } from "@/data/languages.enum"
import type { LanguageString } from "@/components/telegram-patient/container/intake-form/patient-form-translations"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map country names from different languages to English enum keys
export function mapCountryToEnglish(country: string, language: LanguageString): string | null {
  // Use the enum values to map countries
  if (language === "Arabic") {
    // Find the key in CountriesArabic that matches the country name
    const key = Object.keys(CountriesArabic).find((k) => CountriesArabic[k as keyof typeof CountriesArabic] === country)
    return key || null
  } else if (language === "Farsi") {
    const key = Object.keys(CountriesFarsi).find((k) => CountriesFarsi[k as keyof typeof CountriesFarsi] === country)
    return key || null
  } else if (language === "Pashto") {
    const key = Object.keys(CountriesPashto).find((k) => CountriesPashto[k as keyof typeof CountriesPashto] === country)
    return key || null
  }

  // For English, find the key directly in the Countries enum
  const key = Object.keys(Countries).find((k) => Countries[k as keyof typeof Countries] === country)
  return key || null
}

// Re-export all enums for convenience
export {
  Countries,
  CountriesArabic,
  CountriesFarsi,
  CountriesPashto,
  Languages,
  LanguagesArabic,
  LanguagesFarsi,
  LanguagesPashto,
}


