// apps/web/components/adminDashboard/sections/existing-users/CallLogsViewModel.ts
"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { CallStatus } from "@fajr/shared/calls";

export interface AdminCallParticipant {
  id: string;
  name: string;
  email: string;
  image: string | null;
  accountType: string;
  status?: string;
  joinedAt?: string | null;
}

export interface AdminCallLog {
  callId: string;
  kind: "audio" | "video";
  status: CallStatus;
  isGroupCall: boolean;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  endReason: string | null;
  caller: AdminCallParticipant | null;
  callees: AdminCallParticipant[];
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CallLogsResponse {
  calls: AdminCallLog[];
  pagination: PaginationData;
}

export type CallStatusFilter = "all" | "completed" | "missed" | "declined";

export function useCallLogsViewModel() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [statusFilter, setStatusFilter] = useState<CallStatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery<CallLogsResponse>({
    queryKey: ["adminCallLogs", page, limit, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const response = await axios.get(
        `/api/admin/GET/call-logs?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!session?.user?.isAdmin,
  });

  const calls = useMemo(() => data?.calls ?? [], [data]);

  // Filtered client-side: the page is already bounded at 50 rows, and a
  // server-side name search would mean joining users into the count query too.
  const filteredCalls = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((call) => {
      const names = [
        call.caller?.name,
        call.caller?.email,
        ...call.callees.flatMap((c) => [c.name, c.email]),
      ];
      return names.some((n) => n?.toLowerCase().includes(q));
    });
  }, [calls, search]);

  const pagination = useMemo(
    () =>
      data?.pagination ?? {
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
      },
    [data, limit],
  );

  return {
    calls: filteredCalls,
    totalOnPage: calls.length,
    isLoading,
    error: error ? "Failed to load call logs" : null,
    pagination,
    page,
    setPage,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
  };
}
