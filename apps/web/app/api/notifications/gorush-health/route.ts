// apps/web/app/api/notifications/gorush-health/route.ts
import { NextResponse } from "next/server";

/**
 * Health check endpoint for gorush service
 * Proxies to internal gorush health endpoint
 */
export async function GET() {
  const gorushUrl = process.env.GORUSH_URL || "http://gorush:8088";

  try {
    console.log(`[gorush-health] Fetching from: ${gorushUrl}/healthz`);

    // Gorush has a /healthz endpoint
    const response = await fetch(`${gorushUrl}/healthz`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    // Gorush /healthz returns simple text "ok"
    const text = await response.text();
    console.log(
      `[gorush-health] Response status: ${response.status}, body: ${text.substring(0, 200)}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "gorush",
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseBody: text.substring(0, 200),
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Gorush /healthz returns 200 with empty body when healthy
    return NextResponse.json(
      {
        status: "healthy",
        service: "gorush",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(`[gorush-health] Failed to reach ${gorushUrl}:`, error);

    return NextResponse.json(
      {
        status: "unhealthy",
        service: "gorush",
        url: gorushUrl,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
