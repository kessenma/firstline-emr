// Mobile color theme — imports shared palette, adds platform-specific theme layers.
// Source of truth for palette/brand/role colors: @fajr/shared/theme

import {
  palette,
  brandColors,
  roleColors,
  documentTypeColors,
  medicalStatusColors,
} from '@fajr/shared/theme';

// Re-export shared values so existing mobile imports don't break
export { palette, brandColors, roleColors, documentTypeColors, medicalStatusColors };

// Light theme colors
export const lightColors = {
  // Core brand colors
  black: brandColors.black,
  white: brandColors.white,
  navy: brandColors.navy,

  // Primary colors (using navy as primary like web)
  primary: palette.navy[600],
  primaryLight: palette.navy[400],
  primaryDark: palette.navy[800],

  // Secondary colors
  secondary: palette.cello[600],
  secondaryLight: palette.cello[400],
  secondaryDark: palette.cello[800],

  // Background colors
  background: brandColors.white,
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: palette.grey[50],

  // Surface colors (cards, etc.)
  surface: brandColors.white,
  surfaceSecondary: palette.grey[50],
  surfaceTertiary: palette.grey[100],

  // Text colors
  text: brandColors.black,
  textSecondary: '#666666',
  textTertiary: palette.grey[500],
  textInverse: brandColors.white,

  // Border colors
  border: '#E5E5E5',
  borderLight: palette.grey[200],
  borderDark: palette.grey[300],

  // Status colors
  success: palette.green[600],
  successLight: palette.green[400],
  successDark: palette.green[800],

  error: palette.red[500],
  errorLight: palette.red[400],
  errorDark: palette.red[700],

  warning: palette.orange[500],
  warningLight: palette.orange[400],
  warningDark: palette.orange[700],

  info: palette.cello[500],
  infoLight: palette.cello[400],
  infoDark: palette.cello[700],

  // Accent colors
  accent: palette.orange[500],
  accentLight: palette.orange[400],
  accentDark: palette.orange[700],

  // Tab bar colors
  tabBarBackground: brandColors.white,
  tabBarActive: palette.navy[700],
  tabBarInactive: palette.navy[600],
  tabBarIconActive: brandColors.white,
  tabBarIconInactive: palette.navy[600],

  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowStrong: 'rgba(0, 0, 0, 0.25)',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Special purpose
  transparent: 'transparent',
  divider: palette.grey[200],
} as const;

// Dark theme colors (matching web dark theme)
export const darkColors = {
  // Core brand colors
  black: brandColors.white, // Inverted in dark mode
  white: brandColors.black, // Inverted in dark mode
  navy: palette.navy[200], // Lighter navy for dark mode

  // Primary colors (white text on dark backgrounds)
  primary: brandColors.white,
  primaryLight: palette.grey[300],
  primaryDark: palette.grey[100],

  // Secondary colors
  secondary: palette.grey[400],
  secondaryLight: palette.grey[300],
  secondaryDark: palette.grey[500],

  // Background colors (much darker like web)
  background: '#0A0A0A', // Near black like web --background: 0 0% 3.9%
  backgroundSecondary: '#1A1A1A', // Dark surface
  backgroundTertiary: '#262626', // Even darker

  // Surface colors (cards, etc.)
  surface: '#0F0F0F', // Dark surface like web --card: 0 0% 3.9%
  surfaceSecondary: '#1A1A1A',
  surfaceTertiary: '#262626',

  // Text colors
  text: brandColors.white, // Like web --foreground: 0 0% 98%
  textSecondary: '#A3A3A3', // Like web --muted-foreground: 0 0% 63.9%
  textTertiary: '#737373',
  textInverse: brandColors.black,

  // Border colors
  border: '#262626', // Like web --border: 0 0% 14.9%
  borderLight: '#404040',
  borderDark: '#525252',

  // Status colors (lighter versions for dark backgrounds)
  success: palette.green[400],
  successLight: palette.green[300],
  successDark: palette.green[500],

  error: '#EF4444', // Like web --destructive: 0 62.8% 30.6%
  errorLight: palette.red[300],
  errorDark: palette.red[500],

  warning: palette.orange[400],
  warningLight: palette.orange[300],
  warningDark: palette.orange[500],

  info: palette.cello[400],
  infoLight: palette.cello[300],
  infoDark: palette.cello[500],

  // Accent colors
  accent: palette.grey[400], // Like web --accent: 0 0% 14.9%
  accentLight: palette.grey[300],
  accentDark: palette.grey[500],

  // Tab bar colors
  tabBarBackground: '#0F0F0F',
  tabBarActive: palette.blue[400], // Role-based in web
  tabBarInactive: palette.grey[600],
  tabBarIconActive: brandColors.white,
  tabBarIconInactive: '#A3A3A3',

  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.8)',
  shadowMedium: 'rgba(0, 0, 0, 0.9)',
  shadowStrong: 'rgba(0, 0, 0, 1)',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.8)',
  overlayLight: 'rgba(0, 0, 0, 0.6)',

  // Special purpose
  transparent: 'transparent',
  divider: '#262626',
} as const;

// Export type for colors
export type ColorTheme = typeof lightColors;
export type PaletteColor = typeof palette;

// Helper function to get document type color
export const getDocumentTypeColor = (type: string): string => {
  const lowerType = type.toLowerCase();
  return (
    documentTypeColors[lowerType as keyof typeof documentTypeColors] ||
    documentTypeColors.default
  );
};

// Helper function to get medical status color
export const getMedicalStatusColor = (status: string): string => {
  const lowerStatus = status.toLowerCase();
  return (
    medicalStatusColors[lowerStatus as keyof typeof medicalStatusColors] ||
    medicalStatusColors.pending
  );
};
