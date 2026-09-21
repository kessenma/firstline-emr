// apps/web/components/user-profile/viewModel/useProfileActions.ts
"use client";

import { useCallback } from "react";
import type { Session } from "next-auth";
import type { UseFormReturn } from "react-hook-form";
import type { UserProfileFormValues } from "./types";
import { useToast } from "@/components/hooks/useToast";

export function useProfileActions(
  setIsEditing: (value: boolean) => void,
  methods: UseFormReturn<UserProfileFormValues>,
  profile: UserProfileFormValues | null,
  specialties: string[],
  languages: string[],
  countries: string[],
  setIsLoading: (value: boolean) => void,
  setProfile: (profile: UserProfileFormValues) => void,
  setSpecialties: (specialties: string[]) => void,
  setLanguages: (languages: string[]) => void,
  setCountries: (countries: string[]) => void,
  session: Session | null,
  update: (data?: any) => Promise<Session | null>,
  setIsCopied: (value: boolean) => void,
) {
  const { setToast } = useToast();
  const handleEdit = () => setIsEditing(true);

  const handleCancelEdit = () => {
    setIsEditing(false);
    methods.reset(profile || undefined);
  };

  const handleSubmit = useCallback(
    async (data: UserProfileFormValues) => {
      console.log("handleSubmit called with data:", data);
      if (!profile) {
        console.error("No profile found in handleSubmit");
        return;
      }

      setIsLoading(true);
      try {
        // Get the form data languages
        const formLanguages = data.languages || [];
        const formCountries = data.countries || [];
        const formSpecialties = data.doctorSpecialty || [];

        // console.log("Current languages in state:", languages)
        // console.log("Languages from form data:", formLanguages)
        // console.log("Current countries in state:", countries)
        // console.log("countries from form data:", formCountries)
        console.log("Current specialties in state:", specialties);
        console.log("Specialties from form data:", formSpecialties);

        const payload = {
          ...data,
          doctorSpecialty: formSpecialties,
          languages: formLanguages,
          countries: formCountries,
          specialties: formSpecialties,
        };
        console.log("Sending PATCH request to:", `/api/user/${profile.id}`);
        console.log("Request payload:", payload);

        const response = await fetch(`/api/user/${profile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("API Response status:", response.status);

        if (response.ok) {
          const updatedProfile = await response.json();
          // console.log("Updated profile from API:", updatedProfile)

          setProfile(updatedProfile);
          setSpecialties(updatedProfile.doctorSpecialty || []);
          setLanguages(updatedProfile.languages || []);
          setCountries(updatedProfile.countries || []);

          // Update the session with only the changed fields
          await update({
            user: {
              doctorSpecialty: updatedProfile.doctorSpecialty,
              languages: updatedProfile.languages,
              countries: updatedProfile.countries,
            },
          });

          setToast({
            title: "Profile Updated",
            description: "Your changes have been saved.",
            variant: "success",
          });
          // console.log("Profile updated successfully")
        } else {
          let description = "Failed to update profile";
          try {
            const errorData = await response.json();
            description = errorData?.error || description;
            console.error("Failed to update user:", errorData);
          } catch {}
          setToast({
            title: `Error ${response.status}`,
            description,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error updating user:", error);
        setToast({
          title: "Network Error",
          description: "Could not submit changes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsEditing(false);
      }
    },
    [
      profile,
      specialties,
      session,
      update,
      setIsLoading,
      setProfile,
      setSpecialties,
      setIsEditing,
      setLanguages,
      setCountries,
      setToast,
    ],
  );

  const copyToClipboard = () => {
    if (profile) {
      const id = profile.id;
      if (id) {
        navigator.clipboard.writeText(id).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        });
      }
    }
  };

  return {
    handleEdit,
    handleCancelEdit,
    handleSubmit,
    copyToClipboard,
  };
}
