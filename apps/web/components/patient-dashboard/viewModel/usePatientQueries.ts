// apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts
"use client";

import { useState, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPatients,
  fetchArchivedPatients,
  fetchUnassignedSpecialtyPatients,
  fetchBatchUnreadMessages,
} from "@/lib/api";
import type { PatientWithMessages } from "./types";
import type { ServerPatient } from "@/lib/server/patients";
import type { Patient } from "@/db/schema/patients";

export function usePatientQueries(
  isAuthenticated: boolean,
  userId: string | undefined,
  showArchived: boolean,
  showUnassignedSpecialty: boolean,
  initialPatients?: ServerPatient[] | PatientWithMessages[],
  /** "All Patients" view — one cursor over active AND discharged. */
  includeDischarged: boolean = false,
) {
  const [archivedFetched, setArchivedFetched] = useState(false);
  const [unassignedSpecialtyFetched, setUnassignedSpecialtyFetched] =
    useState(false);
  const queryClient = useQueryClient();

  // Memoize the addUnreadMessages function
  const addUnreadMessages = useCallback(async (data: Patient[]) => {
    if (!data?.length) return [];

    // Extract all chat IDs that need unread message counts
    const chatIds = data
      .filter((patient) => patient.telegramChatId)
      .map((patient) => patient.telegramChatId)
      .filter((id): id is string => !!id); // Type guard to remove undefined/null

    if (chatIds.length === 0) {
      // No chat IDs to fetch, return patients with 0 unread messages
      console.log("[usePatientQueries] No patients with Telegram chat IDs");
      return data.map((patient) => ({
        ...patient,
        unreadMessages: 0,
      })) as PatientWithMessages[];
    }

    console.log(
      `[usePatientQueries] 📥 Batching unread messages for ${chatIds.length} patients`,
    );
    const startTime = performance.now();

    // BATCH REQUEST - fetch all unread messages in ONE API call
    const unreadMessagesMap = await fetchBatchUnreadMessages(chatIds);

    const endTime = performance.now();
    console.log(
      `[usePatientQueries] ✅ Received unread counts for ${Object.keys(unreadMessagesMap).length} chats in ${(endTime - startTime).toFixed(2)}ms`,
    );

    // Map the results back to patients
    return data.map((patient) => ({
      ...patient,
      unreadMessages: patient.telegramChatId
        ? unreadMessagesMap[patient.telegramChatId] || 0
        : 0,
    })) as PatientWithMessages[];
  }, []);

  // Determine which fetch function to use based on view
  const fetchFunction = showUnassignedSpecialty
    ? fetchUnassignedSpecialtyPatients
    : showArchived
      ? fetchArchivedPatients
      : fetchPatients;

  // Infinite query for patients (active, archived, or unassigned specialty)
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "patients",
      showUnassignedSpecialty
        ? "unassigned"
        : showArchived
          ? "archived"
          : includeDischarged
            ? "all"
            : "active",
    ],
    queryFn: async ({ pageParam }) => {
      const response = showUnassignedSpecialty
        ? await fetchUnassignedSpecialtyPatients("minimal", pageParam, 20)
        : showArchived
          ? await fetchArchivedPatients("minimal", pageParam, 20)
          : await fetchPatients("minimal", pageParam, 20, includeDischarged);

      // Add unread messages to the patients
      const patientsWithMessages = await addUnreadMessages(response.data);

      return {
        data: patientsWithMessages,
        nextCursor: response.pagination.nextCursor,
        hasMore: response.pagination.hasMore,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 * 15, // 15 minutes - increased to prevent refetch on tab switch
    gcTime: 1000 * 60 * 30, // 30 minutes - cache time (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Flatten all pages into a single array
  const allPatients = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    patients: allPatients as PatientWithMessages[],
    isLoading,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    refetch,
    archivedFetched,
    unassignedSpecialtyFetched,
  };
}
