// apps/web/components/auth/adminDashboard/sections/NewSignupsViewModel.tsx
"use client";

import { useState } from "react";
import {
  useQueryClient,
  useInfiniteQuery,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/hooks/useToast";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: "Doctor" | "Triage" | "Evac";
  countries?: string[];
  doctorSpecialty?: string;
  medicalLicense?: string; // Add medical license field
}

export interface MissionOption {
  id: string;
  name: string;
  country: string;
  status: string;
}

export function useNewSignupsViewModel() {
  const { data: session } = useSession();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [isCountryVisible, setIsCountryVisible] = useState(false);
  const [isDoctorSpecialtyVisible, setIsDoctorSpecialtyVisible] =
    useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const queryClient = useQueryClient();
  const { setToast } = useToast();

  const {
    data,
    isLoading: loadingNewSignups,
    fetchNextPage: nextNewSignups,
    hasNextPage: hasMoreNewSignups,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["newSignups"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/admin/GET/new-users?page=${pageParam}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${session?.user.token}`,
          },
        },
      );
      if (res.status === 401) {
        setIsSessionExpired(true);
        throw new Error("Session expired");
      }
      if (!res.ok) throw new Error("Failed to fetch new signups");
      const result = await res.json();
      return {
        users: result.users,
        nextPage: pageParam + 1,
        hasMore: result.totalPages > pageParam,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    enabled: !!session?.user.token,
  });

  const newSignups = data?.pages.flatMap((page) => page.users) || [];

  // Fetch available missions for assignment during approval
  const { data: missionsData } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/GET/missions", {
        headers: { Authorization: `Bearer ${session?.user.token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch missions");
      const result = await res.json();
      return result.missions as MissionOption[];
    },
    enabled: !!session?.user.token,
  });

  const missions = missionsData || [];

  const bulkActionMutation = useMutation({
    mutationFn: async ({
      actionType,
      userIds,
      missionId,
    }: {
      actionType: "approve-users" | "deny-users";
      userIds: string[];
      missionId?: string;
    }) => {
      const res = await fetch(`/api/admin/POST/${actionType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user.token}`,
        },
        body: JSON.stringify({ userIds, missionId: missionId || undefined }),
      });
      if (res.status === 401) {
        setIsSessionExpired(true);
        throw new Error("Session expired");
      }
      if (!res.ok) throw new Error(`Failed to ${actionType}`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      setToast({
        title: "Success",
        description: `Selected users ${variables.actionType === "approve-users" ? "approved" : "denied"} successfully.`,
        variant: "default",
      });
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ["newSignups"] });
    },
    onError: (error) => {
      if (error.message === "Session expired") {
        setIsSessionExpired(true);
      }
    },
  });

  const handleSessionRestored = () => {
    setIsSessionExpired(false);
    refetch();
  };

  const handleBulkAction = (actionType: "approve-users" | "deny-users") => {
    if (selectedUsers.length === 0) {
      setToast({
        title: "Error",
        description: "No users selected.",
        variant: "destructive",
      });
      return;
    }
    bulkActionMutation.mutate({
      actionType,
      userIds: selectedUsers,
      missionId: selectedMissionId || undefined,
    });
  };

  const handleCheckboxChange = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers((prev) =>
      prev.length === newSignups.length
        ? []
        : newSignups.map((user: User) => user.id),
    );
  };

  const toggleCountryVisibility = () => setIsCountryVisible((prev) => !prev);
  const toggleDoctorSpecialtyVisibility = () =>
    setIsDoctorSpecialtyVisible((prev) => !prev);

  return {
    newSignups,
    loadingNewSignups,
    hasMoreNewSignups,
    nextNewSignups,
    selectedUsers,
    missions,
    selectedMissionId,
    setSelectedMissionId,
    isCountryVisible,
    isDoctorSpecialtyVisible,
    isSessionExpired,
    setIsSessionExpired,
    handleSessionRestored,
    handleBulkAction,
    handleCheckboxChange,
    handleSelectAll,
    toggleCountryVisibility,
    toggleDoctorSpecialtyVisibility,
  };
}
