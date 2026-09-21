// Re-export domain constants from their canonical location.
// These were moved to @fajr/shared/constants — prefer importing from there directly.
export {
  DoctorSpecialtyList,
  DoctorSpecialties,
} from '../constants/doctor-specialties';

export {
  Languages,
  LanguagesList,
  LanguagesArabic,
  LanguagesListArabic,
  LanguagesFarsi,
  LanguagesListFarsi,
  LanguagesPashto,
  LanguagesListPashto,
  LanguagesTurkish,
  LanguagesListTurkish,
  LanguagesUrdu,
  LanguagesListUrdu,
  LanguagesSpanish,
  LanguagesListSpanish,
  LanguagesFrench,
  LanguagesListFrench,
} from '../constants/languages';

export type { SupportedLanguage } from '../constants/languages';

export {
  Countries,
  CountriesList,
  CountriesArabic,
  CountriesListArabic,
  CountriesFarsi,
  CountriesListFarsi,
  CountriesPashto,
  CountriesListPashto,
  CountriesTurkish,
  CountriesListTurkish,
  CountriesUrdu,
  CountriesListUrdu,
  CountriesSpanish,
  CountriesListSpanish,
  CountriesFrench,
  CountriesListFrench,
  CountryCodes,
  CountryCodesList,
} from '../constants/countries';
