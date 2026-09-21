"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/hooks/useToast";

interface PatientUpdate {
  operation: "INSERT" | "UPDATE" | "DELETE";
  patient_id: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  priority: string | null;
  specialties: string[] | null;
  coordinator_id: string | null;
  updated_at: string | null;
}

interface UseRealtimePatientDashboardOptions {
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time patient dashboard updates via SSE.
 *
 * - Shows a toast notification on patient changes.
 * - Returns `recentlyChangedIds` for row highlight animation.
 * - Invalidates react-query cache so dashboard refetches automatically.
 */
export function useRealtimePatientDashboard({
  enabled = true,
}: UseRealtimePatientDashboardOptions) {
  const queryClient = useQueryClient();
  const { setToast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectedRef = useRef(false);
  const [recentlyChangedIds, setRecentlyChangedIds] = useState<Set<string>>(
    new Set(),
  );

  // Stable ref for setToast so we don't re-create `connect` on every render
  const setToastRef = useRef(setToast);
  setToastRef.current = setToast;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    cleanup();

    const url = "/api/patient/realtime";
    console.log("[patient-realtime] Connecting to SSE:", url);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("[patient-realtime] SSE connection opened");
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
      };

      eventSource.addEventListener("connected", () => {
        console.log("[patient-realtime] Connected event received");
      });

      eventSource.addEventListener("patient-update", (event) => {
        try {
          const update: PatientUpdate = JSON.parse(event.data);
          console.log("[patient-realtime] Patient update received:", update);

          // Build patient name for toast
          const name = [update.first_name, update.last_name]
            .filter(Boolean)
            .join(" ") || "Unknown";

          // Show toast based on operation type
          if (update.operation === "INSERT") {
            setToastRef.current({
              title: "New patient added",
              description: name,
              variant: "success",
            });
          } else if (update.operation === "UPDATE") {
            setToastRef.current({
              title: "Patient updated",
              description: name,
              variant: "default",
            });
          } else if (update.operation === "DELETE") {
            setToastRef.current({
              title: "Patient removed",
              description: name,
              variant: "destructive",
            });
          }

          // Track this patient ID for row highlight animation
          const patientId = update.patient_id;
          if (patientId) {
            setRecentlyChangedIds((prev) => {
              const next = new Set(prev);
              next.add(patientId);
              return next;
            });

            // Clear the highlight after the animation duration (2s)
            setTimeout(() => {
              setRecentlyChangedIds((prev) => {
                const next = new Set(prev);
                next.delete(patientId);
                return next;
              });
            }, 2000);
          }

          // Invalidate all patient queries so dashboard refetches
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        } catch (error) {
          console.error("[patient-realtime] Error parsing update:", error);
        }
      });

      eventSource.addEventListener("heartbeat", () => {
        // Keep-alive — no action needed
      });

      eventSource.onerror = () => {
        console.error("[patient-realtime] SSE connection error");
        isConnectedRef.current = false;
        eventSource.close();

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000,
          );
          console.log(
            `[patient-realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error(
            "[patient-realtime] Max reconnection attempts reached",
          );
        }
      };
    } catch (error) {
      console.error("[patient-realtime] Error creating EventSource:", error);
    }
  }, [enabled, cleanup, queryClient]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount / when enabled changes
  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  // Reconnect when page becomes visible
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !isConnectedRef.current
      ) {
        console.log("[patient-realtime] Page visible, reconnecting...");
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, reconnect]);

  return {
    isConnected: isConnectedRef.current,
    recentlyChangedIds,
    reconnect,
    disconnect: cleanup,
  };
}
