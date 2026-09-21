// @fajr/shared/user — Pure TypeScript validation (no Zod dependency)

import type { ProfileFormValuesBase, ThemeMode, PatientChartViewMode } from './types';
import { PROFILE_CONSTRAINTS } from './constants';
import { THEME_MODE_VALUES, PATIENT_CHART_VIEW_VALUES } from './constants';

// ─── Profile Validation ─────────────────────────────────────────────────────

export interface ProfileValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ProfileFormValuesBase, string>>;
}

/**
 * Validate core profile fields.
 * Each platform can wrap this in their own Zod/react-hook-form schema.
 */
export function validateProfileBase(
  values: Partial<ProfileFormValuesBase>,
): ProfileValidationResult {
  const errors: Partial<Record<keyof ProfileFormValuesBase, string>> = {};

  if (!values.firstName || values.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  }

  if (!values.lastName || values.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  }

  if (values.dob) {
    const date = new Date(values.dob);
    if (isNaN(date.getTime()) || date >= new Date()) {
      errors.dob = 'Please enter a valid date of birth in the past';
    }
  }

  if (
    !values.countries ||
    values.countries.length < PROFILE_CONSTRAINTS.MIN_COUNTRIES
  ) {
    errors.countries = `At least ${PROFILE_CONSTRAINTS.MIN_COUNTRIES} country is required`;
  }

  if (
    !values.languages ||
    values.languages.length < PROFILE_CONSTRAINTS.MIN_LANGUAGES
  ) {
    errors.languages = `At least ${PROFILE_CONSTRAINTS.MIN_LANGUAGES} language is required`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isValidThemeMode(value: string): value is ThemeMode {
  return (THEME_MODE_VALUES as readonly string[]).includes(value);
}

export function isValidPatientChartView(
  value: string,
): value is PatientChartViewMode {
  return (PATIENT_CHART_VIEW_VALUES as readonly string[]).includes(value);
}
