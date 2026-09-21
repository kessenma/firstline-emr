import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/hooks/useToast";
import type { ConflictUser, CareTeamConflictItem } from "@fajr/shared/admin";

export type { ConflictUser, CareTeamConflictItem };

export function useCareTeamConflictsViewModel() {
  const [conflicts, setConflicts] = useState<CareTeamConflictItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);

  const { data: session } = useSession();
  const token = session?.user.token;
  const { setToast, api } = useToast();

  const fetchConflicts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/api/patient/care-team/conflicts?status=unresolved", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setConflicts((data as any)?.conflicts || []);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      setToast?.({
        title: "Error",
        description: "Failed to fetch care team conflicts.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, setToast, api]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const handleResolveConflict = async (
    conflictId: string,
    winnerUserId: string,
    resolutionNotes?: string,
  ) => {
    if (isResolving) return;
    setIsResolving(true);
    try {
      await api.post(
        "/api/patient/care-team/resolve-conflict",
        { conflictId, winnerUserId, resolutionNotes },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Conflict resolved successfully.",
        variant: "default",
      });
      await fetchConflicts();
    } catch (error) {
      console.error("Error resolving conflict:", error);
      setToast?.({
        title: "Error",
        description: "Failed to resolve conflict.",
        variant: "destructive",
      });
    } finally {
      setIsResolving(false);
    }
  };

  return {
    conflicts,
    isLoading,
    isResolving,
    fetchConflicts,
    handleResolveConflict,
  };
}
