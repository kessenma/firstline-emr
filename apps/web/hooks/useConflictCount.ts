"use client";

import { useQuery } from "@tanstack/react-query";

interface ConflictData {
  count: number;
  conflictPatientIds: string[];
}

export function useConflictCount(accountType: string | undefined): ConflictData & { isLoading: boolean } {
  const { data, isLoading } = useQuery<ConflictData>({
    queryKey: ["care-team-conflicts-count"],
    queryFn: async () => {
      const res = await fetch("/api/patient/care-team/conflicts?status=unresolved");
      if (!res.ok) return { count: 0, conflictPatientIds: [] };
      const json = await res.json();
      const conflicts = json.conflicts ?? [];
      return {
        count: conflicts.length,
        conflictPatientIds: conflicts.map((c: any) => c.patientId),
      };
    },
    enabled: accountType === "Triage",
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    count: data?.count ?? 0,
    conflictPatientIds: data?.conflictPatientIds ?? [],
    isLoading,
  };
}
