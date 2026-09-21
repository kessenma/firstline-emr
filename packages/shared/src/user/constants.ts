// @fajr/shared/user — Constants for profile and settings

import type { ThemeMode, PatientChartViewMode } from './types';

// ─── Theme ──────────────────────────────────────────────────────────────────

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const THEME_MODE_VALUES: readonly ThemeMode[] = [
  'light',
  'dark',
  'system',
] as const;

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
} as const;

// ─── Patient Chart View ─────────────────────────────────────────────────────

export const DEFAULT_PATIENT_CHART_VIEW: PatientChartViewMode = 'tabs';

export const PATIENT_CHART_VIEW_VALUES: readonly PatientChartViewMode[] = [
  'tabs',
  'dashboard',
] as const;

export const PATIENT_CHART_VIEW_LABELS: Record<PatientChartViewMode, string> = {
  tabs: 'Tabs',
  dashboard: 'Dashboard',
} as const;

// ─── Profile Constraints ────────────────────────────────────────────────────

export const PROFILE_CONSTRAINTS = {
  FIRST_NAME_MAX: 255,
  LAST_NAME_MAX: 255,
  EMAIL_MAX: 255,
  MIN_COUNTRIES: 1,
  MIN_LANGUAGES: 1,
  MAX_SPECIALTIES: 2,
} as const;
