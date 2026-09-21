"use client";

import { UserProfileView } from "@/components/user-profile/UserProfileView";
import UserSettingsView from "@/components/user-profile/settings/UserSettingsView";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { useUserProfile } from "@/components/user-profile/UserProfileContext";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/user-profile/Header";
import { Toggle } from "@/components/ui/toggle";
import { useUserSettings } from "@/components/user-profile/settings/UserSettingsViewModel";
import { useThemeStore } from "@/stores/useThemeStore";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const UserProfileLogViewer = dynamic(
  () =>
    import("@/components/user-profile/UserProfileLogViewer").then(
      (mod) => mod.UserProfileLogViewer,
    ),
  { ssr: false },
);

interface ProfilePageContentProps {
  userId?: string;
}

export function ProfilePageContent({ userId }: ProfilePageContentProps) {
  const { isEditMode } = useUserProfile();
  const auroraStyle = isEditMode ? "orange" : "accent";
  const { settings, updateSettings } = useUserSettings();

  // Zustand store for immediate theme updates
  const { themeMode, isUpdating, setThemeMode, setIsUpdating } =
    useThemeStore();

  // Sync Zustand store with database settings on initial load
  useEffect(() => {
    if (
      settings?.themeMode &&
      settings.themeMode !== themeMode &&
      !isUpdating
    ) {
      setThemeMode(settings.themeMode);
    }
  }, [settings?.themeMode, themeMode, isUpdating, setThemeMode]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    // Instant UI update
    setThemeMode(newTheme);
    setIsUpdating(true);

    // Fire-and-forget save; do not block UI until network returns
    updateSettings(
      { settings: { themeMode: newTheme } },
      {
        onSuccess: () => {
          setIsUpdating(false);
        },
        onError: (error) => {
          // Keep optimistic theme; just clear updating state
          setIsUpdating(false);
          console.error("Failed to update theme:", error);
        },
      },
    );
  };

  return (
    <AuroraBackground auroraStyle={auroraStyle} performanceMode="medium">
      <Header />
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        <Toggle
          pressed={themeMode === "light"}
          onPressedChange={(on) => {
            if (on && !isUpdating) handleThemeChange("light");
          }}
          variant="outline"
          disabled={isUpdating}
          className="relative min-w-[100px]"
        >
          {isUpdating && themeMode === "light" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Light
        </Toggle>
        <Toggle
          pressed={themeMode === "dark"}
          onPressedChange={(on) => {
            if (on && !isUpdating) handleThemeChange("dark");
          }}
          variant="outline"
          disabled={isUpdating}
          className="relative min-w-[100px]"
        >
          {isUpdating && themeMode === "dark" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Dark
        </Toggle>
        <Toggle
          pressed={themeMode === "system"}
          onPressedChange={(on) => {
            if (on && !isUpdating) handleThemeChange("system");
          }}
          variant="outline"
          disabled={isUpdating}
          className="relative min-w-[100px]"
        >
          {isUpdating && themeMode === "system" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          System
        </Toggle>
      </div>
      <div className="space-y-8 mb-36">
        <UserProfileView />
        {userId && <UserProfileLogViewer userId={userId} />}
        <Separator className={"bg-border"} />
        <UserSettingsView />
      </div>
    </AuroraBackground>
  );
}
