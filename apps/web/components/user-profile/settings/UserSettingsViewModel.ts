// apps/web/components/user-profile/UserSettingsViewModel.ts
// logic:
// 1. when loading the page, check if user has a UserSetting key value pair saved in their user session in the [...nextAuth]/route.ts file
// 1.   a) is the user setting object does exist in the user session take it to go to the user setting collection and retrieve the appropriate settings
// 2. if there is no user setting saved in the user session load the default values (false for all) into the userSetting Route, and then take the object ID and paste that into the user session + user collection
// 3. when the user reloads the page since the user setting object is now saved in both the user collection and user session the page will load from step 1a

"use client";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/components/hooks/useToast";
import type { ThemeMode } from '@fajr/shared/user';

// Default settings for new users - all notification settings default to false
const DEFAULT_SETTINGS: UserSettings = {
  userId: "",
  name: "",
  email: "",
  accountType: "",
  doctorSpecialty: ["Not Selected"],
  lastView: "/",
  themeMode: "system",
};

interface UserSettings {
  id?: string;
  userId: string;
  name: string;
  email: string;
  accountType: string;
  doctorSpecialty?: string[];
  countries?: string[];
  languages?: string[];
  lastView?: string;
  lastViewSavedAt?: string;
  lastViewSessionId?: string;
  themeMode?: ThemeMode;
}

// Using API wrapper in the hook below for auth-expiry handling and headers

// Helper function to get user data from session
const getUserDataFromSession = (session: any) => {
  return {
    name:
      session?.user?.name ||
      (session?.user?.firstName && session?.user?.lastName
        ? `${session.user.firstName} ${session.user.lastName}`
        : ""),
    email: session?.user?.email || "",
    doctorSpecialty: session?.user?.doctorSpecialty || ["Not Selected"],
  };
};

// Fix the useUserSettings hook to properly handle settings initialization
export const useUserSettings = () => {
  const { data: session } = useSession();
  const { api } = useToast();
  const userId = session?.user?.id;
  const [hasInitialized, setHasInitialized] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: settings,
    refetch,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["userSettings", userId],
    queryFn: async () => {
      if (!userId) return Promise.reject("User ID is undefined");

      try {
        const settingsData = await api.get(`/api/user-settings/${userId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(session?.user?.token
              ? { Authorization: `Bearer ${session.user.token}` }
              : {}),
          },
        });
        // Ensure boolean values are properly typed
        return {
          ...(settingsData as any),
          themeMode: ((settingsData as any)?.themeMode ?? "system") as
            | "light"
            | "dark"
            | "system",
        } as UserSettings;
      } catch (error: any) {
        // If settings don't exist yet, return defaults; otherwise rethrow
        if (
          typeof error?.message === "string" &&
          /HTTP\s+404/i.test(error.message)
        ) {
          // Mark that we need to initialize settings
          setHasInitialized(false);
          return {
            ...DEFAULT_SETTINGS,
            userId,
            ...getUserDataFromSession(session),
            accountType: session?.user?.accountType || "User",
          };
        }
        throw error;
      }
    },
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  // Update the mutation function to support callbacks for optimistic updates
  const mutation = useMutation({
    mutationFn: async ({ settings }: { settings: Partial<UserSettings> }) => {
      if (!userId) throw new Error("User ID is undefined");

      const result = await api.patch(
        `/api/user-settings/${userId}`,
        { settings },
        {
          headers: {
            "Content-Type": "application/json",
            ...(session?.user?.token
              ? { Authorization: `Bearer ${session.user.token}` }
              : {}),
          },
        },
      );

      return result;
    },
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(["userSettings", userId], data);
      setHasInitialized(true);
      // Clear the creation flag
      if (typeof sessionStorage !== "undefined" && userId) {
        sessionStorage.removeItem(`user-settings-creating-${userId}`);
      }
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      // Clear the creation flag on error too
      if (typeof sessionStorage !== "undefined" && userId) {
        sessionStorage.removeItem(`user-settings-creating-${userId}`);
      }
    },
  });

  // Initialize settings ONLY if they don't exist (hasInitialized is false after 404 from queryFn)
  useEffect(() => {
    if (!userId || isLoading || hasInitialized || !settings) return;

    // If settings have an id, they already exist in the database
    if (settings.id) {
      setHasInitialized(true);
      return;
    }

    // Check if we're already creating settings (across remounts)
    const creatingKey = `user-settings-creating-${userId}`;
    if (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(creatingKey)
    ) {
      return;
    }

    // Otherwise, create new settings (only once)

    // Set flag in sessionStorage to prevent duplicate calls
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(creatingKey, "true");
    }

    mutation.mutate({
      settings: {
        ...DEFAULT_SETTINGS,
        userId,
        ...getUserDataFromSession(session),
        accountType: session?.user?.accountType || "User",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoading, hasInitialized, settings?.id]);

  return {
    settings: settings || {
      ...DEFAULT_SETTINGS,
      userId,
      ...getUserDataFromSession(session),
      accountType: session?.user?.accountType || "User",
    },
    updateSettings: mutation.mutate,
    isLoading,
  };
};
