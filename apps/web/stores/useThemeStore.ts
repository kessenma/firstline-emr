// apps/web/stores/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  themeMode: ThemeMode;
  isUpdating: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setIsUpdating: (isUpdating: boolean) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

// Custom cookie storage for Zustand persist
const cookieStorage = {
  getItem: (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const matches = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return matches ? decodeURIComponent(matches[1]) : null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof document === 'undefined') return;
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
  },
  removeItem: (name: string): void => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; path=/; max-age=0`;
  },
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      isUpdating: false,

      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode });

        // Also update cookie immediately for SSR/initial load
        if (typeof document !== 'undefined') {
          const maxAge = 60 * 60 * 24 * 365;
          document.cookie = `themeMode=${encodeURIComponent(mode)}; path=/; max-age=${maxAge}`;
        }
      },

      setIsUpdating: (isUpdating: boolean) => {
        set({ isUpdating });
      },

      getEffectiveTheme: () => {
        const { themeMode } = get();
        if (themeMode === 'system') {
          if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return 'light';
        }
        return themeMode;
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({ themeMode: state.themeMode }),
    }
  )
);
