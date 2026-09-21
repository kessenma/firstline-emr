// apps/web/app/api/patient/realtime/route.ts

import { NextRequest } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { pgNotificationHub } from "@/lib/pg-notification-hub";

/**
 * GET /api/patient/realtime
 *
 * Server-Sent Events (SSE) endpoint for real-time patient dashboard updates.
 * Uses the shared PgNotificationHub — no per-client PG connection.
 *
 * Sends events when patients are created, updated, or deleted so the
 * dashboard can refresh automatically.
 *
 * @example
 * const eventSource = new EventSource('/api/patient/realtime');
 * eventSource.addEventListener('patient-update', (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Patient changed:', data);
 * });
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("[patient-realtime] New SSE connection", {
    userId: session.userId,
  });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

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

      // Subscribe to the shared notification hub
      const unsubscribe = pgNotificationHub.subscribe(
        "patients_changes",
        (rawPayload: string) => {
          try {
            const payload = JSON.parse(rawPayload);
            console.log("[patient-realtime] Sending update:", payload);
            sendEvent(payload, "patient-update");
          } catch (error) {
            console.error(
              "[patient-realtime] Error processing notification:",
              error,
            );
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
          console.error("[patient-realtime] Heartbeat error:", error);
          isClosed = true;
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        if (isClosed) {
          return;
        }
        isClosed = true;

        console.log("[patient-realtime] Client disconnected, cleaning up...");

        clearInterval(heartbeatInterval);
        unsubscribe();

        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
        }
      });
    },
    cancel() {
      console.log("[patient-realtime] Stream cancelled by client");
    },
  });

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
