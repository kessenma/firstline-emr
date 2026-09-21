// apps/web/lib/api.ts
import type { PatientFieldSelection } from "@/types/patient";

export const fetchPatients = async (
  fields: PatientFieldSelection = "minimal",
  cursor?: string,
  limit: number = 20,
  /** "All Patients" view — returns active AND discharged from one cursor. */
  includeDischarged: boolean = false,
) => {
  const params = new URLSearchParams({ fields });
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());
  if (includeDischarged) params.append("scope", "all");

  const response = await fetch(`/api/patient?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch patients");
  }
  return response.json();
};

export const fetchArchivedPatients = async (
  fields: PatientFieldSelection = "minimal",
  cursor?: string,
  limit: number = 20,
) => {
  const params = new URLSearchParams({ fields });
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());

  const response = await fetch(`/api/patient/archived?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch archived patients");
  }
  return response.json();
};

export const fetchUnassignedSpecialtyPatients = async (
  fields: PatientFieldSelection = "minimal",
  cursor?: string,
  limit: number = 20,
) => {
  const params = new URLSearchParams({ fields });
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());

  const response = await fetch(
    `/api/patient/unassigned-specialty?${params.toString()}`,
    {
      credentials: "include",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to fetch unassigned specialty patients");
  }
  return response.json();
};

export const fetchUnreadMessages = async (chatId: string) => {
  try {
    const response = await fetch(
      `/api/telegram-thread/${encodeURIComponent(chatId)}/get-unread-count`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.unreadCount || 0;
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    return 0;
  }
};

export const updatePatient = async (id: string, data: any) => {
  const response = await fetch(`/api/patient/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update patient");
  }

  return response.json();
};

/**
 * Fetch unread message counts for multiple chat IDs in a single batch request
 *
 * @param chatIds - Array of Telegram chat IDs
 * @returns Map of chatId -> unread message count
 */
export const fetchBatchUnreadMessages = async (
  chatIds: string[],
): Promise<Record<string, number>> => {
  // Handle edge cases
  if (!chatIds || chatIds.length === 0) {
    console.log("[Batch API] No chat IDs to fetch");
    return {};
  }

  // Remove duplicates
  const uniqueChatIds = [...new Set(chatIds)];

  console.log(
    `[Batch API] Fetching unread messages for ${uniqueChatIds.length} chats`,
  );

  try {
    const response = await fetch("/api/telegram/unread-messages/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ chatIds: uniqueChatIds }),
    });

    if (!response.ok) {
      console.error(
        "[Batch API] Failed to fetch batch unread messages:",
        response.status,
        response.statusText,
      );
      // Return empty map on error - don't break the dashboard
      return {};
    }

    const data = await response.json();
    console.log(
      `[Batch API] Successfully received unread counts for ${Object.keys(data).length} chats`,
    );

    return data;
  } catch (error) {
    console.error("[Batch API] Error fetching batch unread messages:", error);
    // Return empty map on error - graceful degradation
    return {};
  }
};
