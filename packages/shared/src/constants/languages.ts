export enum Languages {
  ENGLISH = 'English',
  ARABIC = 'Arabic',
  FARSI = 'Farsi',
  PASHTO = 'Pashto',
  TURKISH = 'Turkish',
  URDU = 'Urdu',
  SPANISH = 'Spanish',
  FRENCH = 'French',
}

export const LanguagesList = Object.values(Languages);

export enum LanguagesArabic {
  ENGLISH = 'إنجليزي',
  ARABIC = 'العربية',
  FARSI = 'الفارسية',
  PASHTO = 'البشتو',
  TURKISH = 'التركية',
  URDU = 'الأردية',
  SPANISH = 'الإسبانية',
  FRENCH = 'الفرنسية',
}

export const LanguagesListArabic = Object.values(LanguagesArabic);

export enum LanguagesFarsi {
  ENGLISH = 'انگلیسی',
  ARABIC = 'عربی',
  FARSI = 'فارسی',
  PASHTO = 'پشتو',
  TURKISH = 'ترکی',
  URDU = 'اردو',
  SPANISH = 'اسپانیایی',
  FRENCH = 'فرانسوی',
}

export const LanguagesListFarsi = Object.values(LanguagesFarsi);

export enum LanguagesPashto {
  ENGLISH = 'انګلیسي',
  ARABIC = 'عربي',
  FARSI = 'فارسي',
  PASHTO = 'پښتو',
  TURKISH = 'ترکی',
  URDU = 'اردو',
  SPANISH = 'هسپانیه ایی',
  FRENCH = 'فرانسوي',
}

export const LanguagesListPashto = Object.values(LanguagesPashto);

export enum LanguagesTurkish {
  ENGLISH = 'İngilizce',
  ARABIC = 'Arapça',
  FARSI = 'Farsça',
  PASHTO = 'Peştuca',
  TURKISH = 'Türkçe',
  URDU = 'Urduca',
  SPANISH = 'İspanyolca',
  FRENCH = 'Fransızca',
}

export const LanguagesListTurkish = Object.values(LanguagesTurkish);

export enum LanguagesUrdu {
  ENGLISH = 'انگریزی',
  ARABIC = 'عربی',
  FARSI = 'فارسی',
  PASHTO = 'پشتو',
  TURKISH = 'ترکی',
  URDU = 'اردو',
  SPANISH = 'ہسپانوی',
  FRENCH = 'فرانسیسی',
}

export const LanguagesListUrdu = Object.values(LanguagesUrdu);

export enum LanguagesSpanish {
  ENGLISH = 'Inglés',
  ARABIC = 'Árabe',
  FARSI = 'Persa',
  PASHTO = 'Pastún',
  TURKISH = 'Turco',
  URDU = 'Urdu',
  SPANISH = 'Español',
  FRENCH = 'Francés',
}

export const LanguagesListSpanish = Object.values(LanguagesSpanish);

export enum LanguagesFrench {
  ENGLISH = 'Anglais',
  ARABIC = 'Arabe',
  FARSI = 'Persan',
  PASHTO = 'Pachtoune',
  TURKISH = 'Turc',
  URDU = 'Ourdou',
  SPANISH = 'Espagnol',
  FRENCH = 'Français',
}

export const LanguagesListFrench = Object.values(LanguagesFrench);

export type SupportedLanguage = `${Languages}`;

/**
 * Languages written right-to-left.
 *
 * Lives here rather than next to any one component because the same set is
 * needed on web and mobile, and by both patient-facing and staff-facing UI.
 * Previously it was copy-pasted per call site, which is how a set like this
 * quietly drifts.
 */
export const RTL_LANGUAGES: ReadonlySet<Languages> = new Set([
  Languages.ARABIC,
  Languages.FARSI,
  Languages.PASHTO,
  Languages.URDU,
]);

/** Whether text in this language should render right-to-left. */
export function isRtlLanguage(
  language: Languages | SupportedLanguage | string | null | undefined,
): boolean {
  return RTL_LANGUAGES.has(language as Languages);
}

const LANGUAGE_ALIASES: Record<string, Languages> = {
  english: Languages.ENGLISH,
  en: Languages.ENGLISH,
  arabic: Languages.ARABIC,
  ar: Languages.ARABIC,
  farsi: Languages.FARSI,
  fa: Languages.FARSI,
  persian: Languages.FARSI,
  pashto: Languages.PASHTO,
  ps: Languages.PASHTO,
  turkish: Languages.TURKISH,
  tr: Languages.TURKISH,
  urdu: Languages.URDU,
  ur: Languages.URDU,
  spanish: Languages.SPANISH,
  es: Languages.SPANISH,
  french: Languages.FRENCH,
  fr: Languages.FRENCH,
};

/**
 * Coerce whatever is stored in `patients.language` — a free-text varchar — into
 * a known language, defaulting to English.
 *
 * Accepts full names in any casing and ISO 639-1 codes, because the column has
 * accumulated both over time depending on which form wrote it.
 */
export function normalizeLanguage(language?: string | null): Languages {
  if (!language) return Languages.ENGLISH;
  return LANGUAGE_ALIASES[language.toLowerCase().trim()] || Languages.ENGLISH;
}

/**
 * Display language → BCP-47 tag, for speech recognition.
 *
 * `patients.language` stores an English display name (varchar(100)), not a
 * locale, so anything asking the OS to transcribe a patient has to translate it
 * first. Pashto (ps) and Farsi (fa) are listed for completeness — whether the
 * device can actually transcribe them must be queried at runtime, never
 * assumed. Transcribing an unsupported language does not fail loudly; it
 * produces fluent nonsense, which in a medical record is worse than nothing.
 */
export const LANGUAGE_TO_BCP47: Record<string, string> = {
  English: 'en-US',
  Arabic: 'ar-SA',
  Farsi: 'fa-IR',
  Pashto: 'ps-AF',
  Turkish: 'tr-TR',
  Urdu: 'ur-PK',
  Spanish: 'es-ES',
  French: 'fr-FR',
};

/** Falls back to English for unknown or absent values. */
export function languageToBcp47(language: string | null | undefined): string {
  if (!language) return 'en-US';
  return LANGUAGE_TO_BCP47[language] ?? 'en-US';
}
