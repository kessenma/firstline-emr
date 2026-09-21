// apps/mobile/src/components/ui/RoleIcon.tsx
// Resolves the shared role → icon mapping (@fajr/shared/theme) to
// lucide-react-native components. Web has the mirror of this file at
// apps/web/components/ui/RoleIcon.tsx.

import React from 'react';
import {
  Ambulance,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react-native';
import {
  getRoleTheme,
  getRoleColor,
  type RoleColorShade,
  type RoleIconName,
} from '@fajr/shared/theme';

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
  /** Shade of the role palette to use when `color` isn't given explicitly. */
  shade?: RoleColorShade;
}

export const RoleIcon: React.FC<RoleIconProps> = ({
  accountType,
  shade = 'primary',
  color,
  size = 24,
  ...props
}) => {
  const Icon = getRoleIcon(accountType);

  return (
    <Icon
      size={size}
      color={color ?? getRoleColor(accountType, shade)}
      {...props}
    />
  );
};

export default RoleIcon;
