// apps/mobile/src/components/calls/accountTypeIcon.tsx
//
// Resolves the shared ACCOUNT_TYPE_ICONS names to lucide-react-native
// components. The names live in @fajr/shared/patient because web needs the same
// mapping, but the components can't be shared — web imports lucide-react and
// the two packages' types are incompatible.

import React from 'react';
import {
  Stethoscope,
  Users,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
  UserRound,
} from 'lucide-react-native';
import {
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
  isValidAccountType,
} from '@fajr/shared/patient';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Stethoscope,
  Users,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
};

/** Falls back to a generic person for an account type we don't have an icon for. */
export function AccountTypeIcon({
  accountType,
  size = 14,
  color,
}: {
  accountType: string;
  size?: number;
  color?: string;
}) {
  const name = isValidAccountType(accountType)
    ? ACCOUNT_TYPE_ICONS[accountType]
    : undefined;
  const Icon = (name && ICONS[name]) || UserRound;
  return <Icon size={size} color={color} />;
}

/** "Triage Nurse" rather than the raw enum value "Triage". */
export function accountTypeLabel(accountType: string): string {
  return isValidAccountType(accountType)
    ? ACCOUNT_TYPE_LABELS[accountType]
    : (accountType ?? '').replace(/_/g, ' ');
}
