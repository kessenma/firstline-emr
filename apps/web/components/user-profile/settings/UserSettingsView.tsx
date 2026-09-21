// apps/web/components/user-profile/UserSettingsView.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useUserSettings } from "./UserSettingsViewModel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { Settings2 } from "lucide-react";
import type { UserSettingsType } from "./view/types";
import UserInfoSection from "./view/UserInfoSection";
import SettingsLoadingSkeleton from "./view/SettingsLoadingSkeleton";

export default function UserSettingsView() {
  const { settings, isLoading } = useUserSettings();
  const { data: session } = useSession();
  const userType = session?.user?.accountType;
  const [localSettings, setLocalSettings] = useState<UserSettingsType>({
    name: "",
    email: "",
    accountType: "",
    doctorSpecialty: [""],
    countries: [""],
    languages: [""],
    lastView: "/",
  });
  const initialRenderRef = useRef(true);

  useEffect(() => {
    if (!isLoading && settings) {
      const typedSettings: UserSettingsType = {
        ...settings,
        countries: settings.countries || [],
        languages: settings.languages || [],
        doctorSpecialty: settings.doctorSpecialty || ["Not Selected"],
        lastView: settings.lastView ?? "/",
      };

      if (initialRenderRef.current) {
        initialRenderRef.current = false;
        setLocalSettings(typedSettings);
      } else if (settings.id && localSettings.name) {
        setLocalSettings(typedSettings);
      }
    }
  }, [settings, isLoading]);

  return (
    <Card
      backgroundOpacity={50}
      className={`w-full max-w-3xl mx-auto`}
      backgroundColor="card"
      shadowSize="lg"
    >
      <CardHeader>
        <CardTitle className="text-2xl font-medium text-center flex items-center justify-center gap-2 text-foreground">
          <Settings2 className="h-5 w-5 text-primary" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SettingsLoadingSkeleton userType={userType} />
        ) : (
          <UserInfoSection
            name={localSettings.name}
            email={localSettings.email}
            accountType={localSettings.accountType}
            doctorSpecialty={localSettings.doctorSpecialty}
            userType={userType}
            countries={localSettings.countries}
            languages={localSettings.languages}
          />
        )}
      </CardContent>
    </Card>
  );
}
