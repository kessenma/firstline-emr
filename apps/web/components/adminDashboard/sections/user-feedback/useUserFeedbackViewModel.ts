import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/hooks/useToast";
import type { FeedbackItem } from "@fajr/shared/admin";

export type { FeedbackItem };

export function useUserFeedbackViewModel() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: session } = useSession();
  const token = session?.user.token;
  const { setToast, api } = useToast();

  const fetchFeedback = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      params.set("limit", "100");

      const data = await api.get(`/api/feedback?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setFeedback((data as any)?.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      setToast?.({
        title: "Error",
        description: "Failed to fetch feedback.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, categoryFilter, setToast, api]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleUpdateFeedback = async (
    feedbackId: string,
    status: string,
    adminNotes?: string,
  ) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await api.patch(
        `/api/feedback/${feedbackId}`,
        { status, adminNotes },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Feedback updated successfully.",
        variant: "default",
      });
      await fetchFeedback();
    } catch (error) {
      console.error("Error updating feedback:", error);
      setToast?.({
        title: "Error",
        description: "Failed to update feedback.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchFeedbackDetail = async (
    feedbackId: string,
  ): Promise<FeedbackItem | null> => {
    try {
      const data = await api.get(`/api/feedback/${feedbackId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      return (data as any)?.feedback || null;
    } catch (error) {
      console.error("Error fetching feedback detail:", error);
      return null;
    }
  };

  const handleCreateThread = async (
    feedbackId: string,
  ): Promise<string | null> => {
    try {
      const data = await api.post(
        `/api/feedback/${feedbackId}/create-thread`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const threadId = (data as any)?.threadId;
      if (threadId) {
        setToast?.({
          title: "Success",
          description: "Chat thread created.",
          variant: "default",
        });
        await fetchFeedback();
      }
      return threadId || null;
    } catch (error) {
      console.error("Error creating thread:", error);
      setToast?.({
        title: "Error",
        description: "Failed to create chat thread.",
        variant: "destructive",
      });
      return null;
    }
  };

  const openCount = feedback.filter((f) => f.status === "open").length;

  return {
    feedback,
    isLoading,
    isUpdating,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    fetchFeedback,
    handleUpdateFeedback,
    handleCreateThread,
    fetchFeedbackDetail,
    openCount,
  };
}
