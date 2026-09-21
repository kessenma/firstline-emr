// apps/web/components/patient-chart/telegram-messages/view-model/useRealtimeMessages.ts

"use client"

import { useEffect, useRef, useCallback } from "react"
import type { TelegramMessage } from "./types"

interface RealtimeUpdate {
  operation: "INSERT" | "UPDATE" | "DELETE"
  chat_id: string
  thread_id: string
  patient_id: string | null
  updated_at: string
  unread_count: number
  message_count: number
}

interface UseRealtimeMessagesOptions {
  chatId: string
  patientId?: string
  enabled?: boolean
  onUpdate?: (update: RealtimeUpdate) => void
  onError?: (error: Error) => void
  onReconnect?: () => void
}

/**
 * Hook to subscribe to real-time telegram thread updates via Server-Sent Events (SSE)
 *
 * Uses PostgreSQL LISTEN/NOTIFY to receive instant updates when telegram_threads table changes
 *
 * @example
 * const { isConnected, reconnect } = useRealtimeMessages({
 *   chatId: "123456789",
 *   enabled: true,
 *   onUpdate: (update) => {
 *     console.log("Thread updated:", update);
 *     // Reload messages or update state
 *   }
 * });
 */
export function useRealtimeMessages({
  chatId,
  patientId,
  enabled = true,
  onUpdate,
  onError,
  onReconnect,
}: UseRealtimeMessagesOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const isConnectedRef = useRef(false)

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("[realtime] Cleaning up EventSource")
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    isConnectedRef.current = false
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !chatId) {
      console.log("[realtime] Connection disabled or no chatId")
      return
    }

    // Clean up existing connection
    cleanup()

    // Build URL with query parameters
    const params = new URLSearchParams({ chatId })
    if (patientId) {
      params.append("patientId", patientId)
    }

    const url = `/api/telegram-thread/realtime?${params.toString()}`
    console.log("[realtime] Connecting to SSE:", url)

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("[realtime] SSE connection opened")
        isConnectedRef.current = true
        reconnectAttemptsRef.current = 0
      }

      eventSource.addEventListener("connected", (event) => {
        console.log("[realtime] Connected event received:", event.data)
      })

      eventSource.addEventListener("thread-update", (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data)
          console.log("[realtime] Thread update received:", update)

          // Only process updates for our chat
          if (update.chat_id === chatId) {
            onUpdate?.(update)
          }
        } catch (error) {
          console.error("[realtime] Error parsing update:", error)
          onError?.(error instanceof Error ? error : new Error("Parse error"))
        }
      })

      eventSource.addEventListener("heartbeat", (event) => {
        // Keep connection alive - no action needed
        // console.log("[realtime] Heartbeat received")
      })

      eventSource.addEventListener("error", (event) => {
        console.log("[realtime] Error event received")
      })

      eventSource.onerror = (error) => {
        console.error("[realtime] SSE connection error:", error)
        isConnectedRef.current = false

        eventSource.close()

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          console.log(`[realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            onReconnect?.()
            connect()
          }, delay)
        } else {
          console.error("[realtime] Max reconnection attempts reached")
          onError?.(new Error("Failed to establish real-time connection"))
        }
      }
    } catch (error) {
      console.error("[realtime] Error creating EventSource:", error)
      onError?.(error instanceof Error ? error : new Error("Connection error"))
    }
  }, [enabled, chatId, patientId, onUpdate, onError, onReconnect, cleanup])

  const reconnect = useCallback(() => {
    console.log("[realtime] Manual reconnect requested")
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Set up connection on mount and when dependencies change
  useEffect(() => {
    if (enabled && chatId) {
      connect()
    }

    // Cleanup on unmount or when disabled
    return () => {
      cleanup()
    }
  }, [enabled, chatId, patientId, connect, cleanup])

  // Handle page visibility changes - reconnect when page becomes visible
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[realtime] Page visible, checking connection")
        if (!isConnectedRef.current) {
          console.log("[realtime] Reconnecting after page visibility")
          reconnect()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [enabled, reconnect])

  return {
    isConnected: isConnectedRef.current,
    reconnect,
    disconnect: cleanup,
  }
}
