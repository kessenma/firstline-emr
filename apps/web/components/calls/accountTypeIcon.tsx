// apps/web/components/calls/accountTypeIcon.tsx
//
// Resolves the shared ACCOUNT_TYPE_ICONS names to lucide-react components.
// The names live in @fajr/shared/patient because mobile needs the same mapping,
// but the components can't be shared — mobile imports lucide-react-native and
// the two packages' types are incompatible.
"use client";

import React from "react";
import {
  Stethoscope,
  Users,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
  UserRound,
} from "lucide-react";
import {
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
  isValidAccountType,
} from "@fajr/shared/patient";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope,
  Users,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
};

/** Falls back to a generic person for an account type we don't have an icon for. */
export function AccountTypeIcon({
  accountType,
  className,
}: {
  accountType: string;
  className?: string;
}) {
  const name = isValidAccountType(accountType)
    ? ACCOUNT_TYPE_ICONS[accountType]
    : undefined;
  const Icon = (name && ICONS[name]) || UserRound;
  return <Icon className={className} />;
}

/** "Triage Nurse" rather than the raw enum value "Triage". */
export function accountTypeLabel(accountType: string): string {
  return isValidAccountType(accountType)
    ? ACCOUNT_TYPE_LABELS[accountType]
    : (accountType ?? "").replace(/_/g, " ");
}
