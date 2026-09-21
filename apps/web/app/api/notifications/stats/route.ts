// apps/web/app/api/notifications/stats/route.ts
import { NextResponse } from "next/server";

/**
 * Statistics endpoint for push notifications
 * Returns aggregated stats about notification delivery
 */
export async function GET() {
  try {
    const notificationsServerUrl =
      process.env.NOTIFICATIONS_SERVER_URL ||
      "http://notifications-server:8080";

    const response = await fetch(`${notificationsServerUrl}/api/push/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // Stats are optional, return empty stats on error
      return NextResponse.json(
        {
          total_sent: 0,
          ios_sent: 0,
          android_sent: 0,
          failed: 0,
          last_24h: 0,
          last_hour: 0,
        },
        { status: 200 },
      );
    }

    const data = await response.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch notification stats:", error);

    // Return empty stats on error
    return NextResponse.json(
      {
        total_sent: 0,
        ios_sent: 0,
        android_sent: 0,
        failed: 0,
        last_24h: 0,
        last_hour: 0,
      },
      { status: 200 },
    );
  }
}
