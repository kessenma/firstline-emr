// apps/web/app/api/telegram-thread/realtime/route.ts

import { NextRequest } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { pgNotificationHub } from "@/lib/pg-notification-hub";

/**
 * GET /api/telegram-thread/realtime
 *
 * Server-Sent Events (SSE) endpoint for real-time telegram thread updates.
 * Uses the shared PgNotificationHub (single LISTEN connection) instead of
 * checking out a pool connection per client — prevents pool exhaustion.
 *
 * Query Parameters:
 * - chatId: (optional) Filter updates for a specific telegram chat ID
 * - patientId: (optional) Filter updates for a specific patient
 *
 * @example
 * const eventSource = new EventSource('/api/telegram-thread/realtime?chatId=123456789');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Thread updated:', data);
 * };
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get("chatId");
  const patientId = searchParams.get("patientId");

  console.log("[realtime] New SSE connection", {
    userId: session.userId,
    chatId,
    patientId,
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      // Helper to send SSE message
      const sendEvent = (data: any, event?: string) => {
        if (isClosed) return;
        try {
          const message = event
            ? `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            : `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          isClosed = true;
        }
      };

      // Send initial connection message
      sendEvent({ type: "connected", timestamp: new Date().toISOString() });

      // Subscribe to the shared notification hub (no pool connection needed)
      const unsubscribe = pgNotificationHub.subscribe(
        "telegram_threads_changes",
        (rawPayload: string) => {
          try {
            const payload = JSON.parse(rawPayload);

            // Filter by chatId if specified
            if (chatId && payload.chat_id !== chatId) {
              return;
            }

            // Filter by patientId if specified
            if (patientId && payload.patient_id !== patientId) {
              return;
            }

            console.log("[realtime] Sending update:", payload);
            sendEvent(payload, "thread-update");
          } catch (error) {
            console.error("[realtime] Error processing notification:", error);
          }
        },
      );

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          sendEvent(
            { type: "heartbeat", timestamp: new Date().toISOString() },
            "heartbeat",
          );
        } catch (error) {
          console.error("[realtime] Heartbeat error:", error);
          isClosed = true;
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        if (isClosed) {
          console.log(
            "[realtime] Client disconnect event fired but already cleaned up",
          );
          return;
        }
        isClosed = true;

        console.log("[realtime] Client disconnected, cleaning up...");

        clearInterval(heartbeatInterval);
        unsubscribe();

        try {
          controller.close();
          console.log("[realtime] Stream controller closed");
        } catch (error) {
          console.log("[realtime] Controller already closed");
        }
      });
    },
    cancel() {
      console.log("[realtime] Stream cancelled by client");
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
