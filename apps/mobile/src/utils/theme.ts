// Central theme configuration for the Fajr Mobile EMR app
// Shared values (palette, spacing, borderRadius, fontSize) come from @fajr/shared/theme
// Platform-specific values (shadows, animation, helpers) stay here

import { lightColors, darkColors, palette, roleColors } from './colors';
import {
  spacing as sharedSpacing,
  borderRadius as sharedBorderRadius,
  typographyScale,
} from '@fajr/shared/theme';

// Re-export shared spacing and borderRadius
export const spacing = sharedSpacing;
export const borderRadius = sharedBorderRadius;

// Typography: shared fontSize + mobile-specific fontWeight/lineHeight
export const typography = {
  fontSize: typographyScale,
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
} as const;

// Shadow presets
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// Animation durations
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

// Common component sizes
export const sizes = {
  button: {
    sm: { height: 32, paddingHorizontal: 12 },
    md: { height: 40, paddingHorizontal: 16 },
    lg: { height: 48, paddingHorizontal: 20 },
    xl: { height: 56, paddingHorizontal: 24 },
  },
  input: {
    sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
    md: { height: 44, paddingHorizontal: 16, fontSize: 16 },
    lg: { height: 52, paddingHorizontal: 20, fontSize: 18 },
  },
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  },
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    xxl: 96,
  },
} as const;

// Theme modes
export type ThemeMode = 'light' | 'dark';

// User roles (matching web app)
export type UserRole = 'doctor' | 'triage' | 'medical' | 'admin';

// Complete theme object
export interface Theme {
  mode: ThemeMode;
  role?: UserRole;
  colors: typeof lightColors | typeof darkColors;
  palette: typeof palette;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  shadows: typeof shadows;
  animation: typeof animation;
  sizes: typeof sizes;
}

// Create theme for a specific mode
export const createTheme = (mode: ThemeMode = 'light', role?: UserRole): Theme => {
  const baseColors = mode === 'light' ? lightColors : darkColors;
  const colors = role ? applyRoleColors(baseColors, role, mode) : baseColors;

  return {
    mode,
    role,
    colors,
    palette,
    spacing,
    borderRadius,
    typography,
    shadows,
    animation,
    sizes,
  };
};

// Apply role-based color overrides (matching web ThemeProvider logic)
const applyRoleColors = (
  baseColors: typeof lightColors | typeof darkColors,
  role: UserRole,
  mode: ThemeMode
): typeof lightColors | typeof darkColors => {
  const roleColorMap: Record<UserRole, keyof typeof roleColors> = {
    doctor: 'doctor', // blue primary
    triage: 'triage', // teal primary
    medical: 'medical', // red primary
    admin: 'navy', // navy primary
  };

  const roleKey = roleColorMap[role];
  if (!roleKey || !roleColors[roleKey]) return baseColors;

  const roleTheme = roleColors[roleKey];

  // In dark mode, use different primary colors (matching web dark theme)
  if (mode === 'dark') {
    return {
      ...baseColors,
      primary: baseColors.text, // White text as primary in dark mode
      primaryLight: palette.grey[300],
      primaryDark: palette.grey[100],
    } as unknown as typeof baseColors;
  }

  // In light mode, apply role-specific primary colors
  return {
    ...baseColors,
    primary: roleTheme.primary,
    primaryLight: roleTheme.light,
    primaryDark: roleTheme.dark,
  } as unknown as typeof baseColors;
};

// Default themes
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

// Default export
export default {
  light: lightTheme,
  dark: darkTheme,
  spacing,
  borderRadius,
  typography,
  shadows,
  animation,
  sizes,
  palette,
};

// Helper functions for commonly used styles
export const helpers = {
  // Center content
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  // Flex row
  row: {
    flexDirection: 'row' as const,
  },

  // Flex column
  column: {
    flexDirection: 'column' as const,
  },

  // Absolute fill
  absoluteFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Text styles
  textCenter: {
    textAlign: 'center' as const,
  },

  textBold: {
    fontWeight: typography.fontWeight.bold,
  },

  textMedium: {
    fontWeight: typography.fontWeight.medium,
  },

  // Create a card style
  card: (theme: Theme) => ({
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.md,
  }),

  // Create a button style
  button: (
    theme: Theme,
    variant: 'primary' | 'secondary' | 'outline' = 'primary',
  ) => {
    const baseStyle = {
      borderRadius: borderRadius.lg,
      ...sizes.button.md,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.secondary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      default:
        return baseStyle;
    }
  },

  // Create input style
  input: (theme: Theme) => ({
    ...sizes.input.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    color: theme.colors.text,
    fontSize: typography.fontSize.base,
  }),

  // Create divider style
  divider: (
    theme: Theme,
    orientation: 'horizontal' | 'vertical' = 'horizontal',
  ) => ({
    backgroundColor: theme.colors.divider,
    ...(orientation === 'horizontal'
      ? { height: 1, width: '100%' }
      : { width: 1, height: '100%' }),
  }),
};

// Export everything
export * from './colors';
