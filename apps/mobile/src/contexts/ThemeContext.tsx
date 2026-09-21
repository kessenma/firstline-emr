import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, type Theme, type ThemeMode } from '../utils/theme';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const themeMode: ThemeMode = systemColorScheme === 'dark' ? 'dark' : 'light';
  const theme = createTheme(themeMode);

  return (
    <ThemeContext.Provider value={{ theme, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hook to get just the theme object
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// Convenience hook to check if dark mode is active
export function useIsDarkMode() {
  const { themeMode } = useTheme();
  return themeMode === 'dark';
}
