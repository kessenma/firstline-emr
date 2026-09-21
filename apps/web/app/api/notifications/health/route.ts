// apps/web/app/api/notifications/health/route.ts
import { NextResponse } from "next/server";

/**
 * Health check endpoint for notifications-server
 * Proxies to internal notifications-server health endpoint
 */
export async function GET() {
  const notificationsServerUrl =
    process.env.NOTIFICATIONS_SERVER_URL || "http://notifications-server:8080";

  try {
    console.log(
      `[notifications/health] Fetching from: ${notificationsServerUrl}/health`,
    );

    const response = await fetch(`${notificationsServerUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    // Get the raw text first for debugging
    const responseText = await response.text();
    console.log(
      `[notifications/health] Response status: ${response.status}, body: ${responseText.substring(0, 500)}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "notifications-server",
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseBody: responseText.substring(0, 200),
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Try to parse JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: 200 });
    } catch (parseError) {
      console.error(
        "[notifications/health] JSON parse error. Response was:",
        responseText,
      );
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "notifications-server",
          error: `Invalid JSON response from notifications-server`,
          responseBody: responseText.substring(0, 200),
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error(
      `[notifications/health] Failed to reach ${notificationsServerUrl}:`,
      error,
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        service: "notifications-server",
        url: notificationsServerUrl,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
