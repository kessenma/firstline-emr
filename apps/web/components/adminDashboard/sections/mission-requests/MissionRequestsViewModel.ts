import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/hooks/useToast";
import type { MissionRequestRow } from "@fajr/shared/admin";

export type { MissionRequestRow };

export function useMissionRequestsViewModel() {
  const [allRequests, setAllRequests] = useState<MissionRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: session } = useSession();
  const token = session?.user.token;
  const { setToast, api } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/api/admin/GET/mission-requests", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setAllRequests((data as any)?.requests || []);
    } catch (error) {
      console.error("Error fetching mission requests:", error);
      setToast?.({
        title: "Error",
        description: "Failed to fetch mission requests.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, setToast, api]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async (
    requestId: string,
    action: "approve" | "deny",
    reviewNotes?: string,
  ) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await api.post(
        "/api/admin/POST/review-mission-request",
        { requestId, action, reviewNotes },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: `Request ${action === "approve" ? "approved" : "denied"} successfully.`,
        variant: "default",
      });
      await fetchRequests();
    } catch (error) {
      console.error("Error reviewing mission request:", error);
      setToast?.({
        title: "Error",
        description: "Failed to review mission request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter and search
  const filteredRequests = allRequests.filter((req) => {
    if (filterStatus !== "all" && req.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        req.userName.toLowerCase().includes(term) ||
        req.userEmail.toLowerCase().includes(term) ||
        req.missionName.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const requestsByStatus = {
    pending: allRequests.filter((r) => r.status === "pending"),
    approved: allRequests.filter((r) => r.status === "approved"),
    denied: allRequests.filter((r) => r.status === "denied"),
  };

  return {
    requests: filteredRequests,
    requestsByStatus,
    isLoading,
    isProcessing,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    handleReview,
    refetch: fetchRequests,
  };
}
