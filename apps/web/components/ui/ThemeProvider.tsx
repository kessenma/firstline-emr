"use client";
/*
Usage Guide

1) Wrap page content to apply role/brand classes

   import { ThemeProvider } from "@/components/ui/ThemeProvider"

   export default function Page() {
     return (
       <ThemeProvider>
         <div>...</div>
       </ThemeProvider>
     )
   }

   ThemeProvider reads the logged-in user's accountType and sets:
   - role-* → sets --primary (Doctor/Triage)
   - brand-* → sets --accent (Scientific/Global)

2) Style components using Tailwind token classes

   Examples:
   - backgrounds: bg-background
   - text: text-foreground
   - borders: border border-border
   - cards: bg-card text-foreground
   - primary actions: bg-primary text-primary-foreground
   - accents: bg-accent text-accent-foreground

   These map to CSS variables defined in styles/globals.css and adapt to role/brand automatically.

3) Aurora background

   <AuroraBackground auroraStyle="accent" /> uses --accent from brand-* classes.
   In edit mode, you can switch to a neutral style (e.g., "orange").

4) Read tokens in JS when needed

   Use useThemeTokens() only for libraries that require raw values (charts, inline styles).
   Prefer Tailwind token classes for normal UI styling.
*/

import type { ReactNode } from "react";
import { useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUserSettings } from "@/components/user-profile/settings/UserSettingsViewModel";
import { useThemeStore } from "@/stores/useThemeStore";

type ThemeProviderMode = "user" | "admin" | "neutral";

type ThemeProviderProps = {
  children: ReactNode;
  mode?: ThemeProviderMode;
  roleOverride?: string;
  brandOverride?: string;
  themeModeOverride?: "light" | "dark" | "system";
};

export function ThemeProvider({
  children,
  mode = "user",
  roleOverride,
  brandOverride,
  themeModeOverride,
}: ThemeProviderProps) {
  const { data: session } = useSession();
  const accountType = session?.user?.accountType;

  const derivedRoleClass =
    accountType === "Doctor"
      ? "role-doctor"
      : accountType === "Triage"
        ? "role-triage"
        : "";
  const derivedBrandClass =
    accountType === "Doctor"
      ? "brand-scientific"
      : accountType === "Triage"
        ? "brand-global"
        : "";

  const roleClass = roleOverride ?? (mode === "user" ? derivedRoleClass : "");
  const brandClass =
    brandOverride ?? (mode === "user" ? derivedBrandClass : "");

  // Always call hooks at top level (can't be conditional)
  // But we can avoid using settings when mode is not "user"
  const { settings } = useUserSettings();
  const { themeMode: zustandTheme } = useThemeStore();

  // Priority: themeModeOverride > zustand store > settings (only for user mode) > default
  const themeMode =
    themeModeOverride ??
    (mode === "admin"
      ? "dark"
      : mode === "user"
        ? (zustandTheme ?? settings?.themeMode ?? "system")
        : "system");

  useEffect(() => {
    const root =
      typeof document !== "undefined"
        ? document.getElementById("theme-root") || document.documentElement
        : null;
    if (!root) return;

    const applyMode = (mode: "light" | "dark" | "system") => {
      if (mode === "dark") {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else if (mode === "light") {
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      } else {
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          root.classList.add("dark");
          root.setAttribute("data-theme", "dark");
        } else {
          root.classList.remove("dark");
          root.setAttribute("data-theme", "light");
        }
      }
    };

    applyMode(themeMode as "light" | "dark" | "system");
    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `themeMode=${encodeURIComponent(themeMode)}; path=/; max-age=${maxAge}`;
    } catch (e) {}
    const media =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const handler = () => applyMode("system");
    if (media && themeMode === "system")
      media.addEventListener("change", handler);
    return () => {
      if (media && themeMode === "system")
        media.removeEventListener("change", handler);
    };
  }, [themeMode]);

  return (
    <div id="theme-root" className={`${roleClass} ${brandClass}`}>
      {children}
    </div>
  );
}

export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  border: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
};

export function useThemeTokens(): ThemeTokens {
  return useMemo(() => {
    const el =
      typeof document !== "undefined"
        ? document.getElementById("theme-root") || document.documentElement
        : null;
    const get = (name: string) =>
      typeof window !== "undefined" && el
        ? getComputedStyle(el).getPropertyValue(`--${name}`).trim()
        : "";
    return {
      background: get("background"),
      foreground: get("foreground"),
      card: get("card"),
      border: get("border"),
      primary: get("primary"),
      primaryForeground: get("primary-foreground"),
      secondary: get("secondary"),
      secondaryForeground: get("secondary-foreground"),
      accent: get("accent"),
      accentForeground: get("accent-foreground"),
    };
  }, []);
}
