// apps/web/components/user-profile/settings/view/types.tsx
import type { ReactNode } from "react";
import { User } from "lucide-react";

// Define the section types
export type SettingsSectionType = "userInfo";

// Define the section headers
export const SectionHeaders: Record<
  SettingsSectionType,
  { title: string; icon: ReactNode }
> = {
  userInfo: {
    title: "User Information",
    icon: <User className="h-5 w-5 text-accent" />,
  },
};

export type UserSettingsType = {
  name: string;
  email: string;
  accountType: string;
  doctorSpecialty: string[];
  countries: string[];
  languages: string[];
  lastView: string;
};
