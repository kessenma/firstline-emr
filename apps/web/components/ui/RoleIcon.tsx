// apps/web/components/ui/RoleIcon.tsx
// Resolves shared role theming (@fajr/shared/theme) for web: the lucide-react
// icon for a role, plus the Tailwind-side glue (button variant, ring class)
// that has to be written as literal class strings for the compiler to see them.
// Mobile has the mirror of this file at apps/mobile/src/components/ui/RoleIcon.tsx.

import {
  Ambulance,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import {
  getRoleTheme,
  getRoleCssVar,
  roleThemes,
  type RoleColorKey,
  type RoleColorShade,
  type RoleIconName,
} from "@fajr/shared/theme";

const ROLE_ICON_COMPONENTS: Record<RoleIconName, LucideIcon> = {
  Stethoscope,
  Users,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
  Ambulance,
};

/** The lucide component for a role — use when you need the component itself. */
export function getRoleIcon(accountType?: string | null): LucideIcon {
  return ROLE_ICON_COMPONENTS[getRoleTheme(accountType).icon];
}

export interface RoleIconProps extends LucideProps {
  accountType?: string | null;
  /**
   * Color the icon with the role's palette (`var(--color-doctor-primary)`, …).
   * Pass `false` to inherit `currentColor` — e.g. on a filled brand background.
   */
  colored?: boolean;
  shade?: RoleColorShade;
}

export function RoleIcon({
  accountType,
  colored = true,
  shade = "primary",
  style,
  ...props
}: RoleIconProps) {
  const Icon = getRoleIcon(accountType);

  return (
    <Icon
      style={
        colored
          ? { color: getRoleCssVar(accountType, shade), ...style }
          : style
      }
      {...props}
    />
  );
}

const ROLE_BUTTON_VARIANTS: Record<
  RoleColorKey,
  { background: string; outline: string } | null
> = {
  doctor: { background: "doctorBackground", outline: "doctorOutline" },
  triage: { background: "triageBackground", outline: "triageOutline" },
  medical: { background: "medEvacBackground", outline: "medEvacOutline" },
  navy: null, // no brand variant — falls back to the neutral button styles
};

/** Brand `<Button variant>` for a role, or the neutral default when none exists. */
export function getRoleButtonVariant(
  accountType: string | null | undefined,
  kind: "background" | "outline" = "background",
): string {
  const variants = ROLE_BUTTON_VARIANTS[getRoleTheme(accountType).colorKey];
  if (variants) return variants[kind];
  return kind === "outline" ? "outline" : "default";
}

// Written out per role: Tailwind only picks up arbitrary values it can see as
// literal strings, so these cannot be built from a template at runtime.
const ROLE_RING_CLASSES: Record<RoleColorKey, string> = {
  doctor: "ring-[var(--color-doctor-primary)]",
  triage: "ring-[var(--color-triage-primary)]",
  medical: "ring-[var(--color-medical-primary)]",
  navy: "ring-[var(--color-navy-primary)]",
};

/** Ring color class for a role, or `ring-border` when the user has no role. */
export function getRoleRingClass(accountType: string | null | undefined): string {
  if (!accountType) return "ring-border";
  return ROLE_RING_CLASSES[getRoleTheme(accountType).colorKey];
}

const ROLE_LOADER_CLASSES: Record<RoleColorKey, [string, string, string]> = {
  doctor: [
    "text-[color:var(--color-doctor-primary)]",
    "text-[color:var(--color-doctor-light)]",
    "text-[color:var(--color-doctor-dark)]",
  ],
  triage: [
    "text-[color:var(--color-triage-primary)]",
    "text-[color:var(--color-triage-light)]",
    "text-[color:var(--color-triage-dark)]",
  ],
  medical: [
    "text-[color:var(--color-medical-primary)]",
    "text-[color:var(--color-medical-light)]",
    "text-[color:var(--color-medical-dark)]",
  ],
  navy: [
    "text-[color:var(--color-navy-primary)]",
    "text-[color:var(--color-navy-light)]",
    "text-[color:var(--color-navy-dark)]",
  ],
};

/** primary / light / dark text classes for a role — used by stacked loaders. */
export function getRoleShadeClasses(
  accountType: string | null | undefined,
): [string, string, string] | null {
  if (!accountType || !(accountType in roleThemes)) return null;
  return ROLE_LOADER_CLASSES[getRoleTheme(accountType).colorKey];
}

export default RoleIcon;
