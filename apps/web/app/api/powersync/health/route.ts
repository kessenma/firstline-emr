// apps/web/app/api/powersync/health/route.ts
import { NextResponse } from "next/server";

// PowerSync service URL (internal Docker network)
const POWERSYNC_SERVICE_URL =
  process.env.POWERSYNC_SERVICE_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://powersync:6061"
    : "http://localhost:6061");

console.log("=".repeat(80));
console.log("🔄 PowerSync Health API Route Initialized");
console.log(`📡 PowerSync Service URL: ${POWERSYNC_SERVICE_URL}`);
console.log("=".repeat(80));

export async function GET() {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log("=".repeat(80));
  console.log(`📨 [${requestId}] PowerSync health check requested`);

  try {
    console.log(`🔄 [${requestId}] Calling PowerSync health endpoint...`);
    console.log(
      `📡 [${requestId}] URL: ${POWERSYNC_SERVICE_URL}/probes/liveness`,
    );

    const response = await fetch(
      `${POWERSYNC_SERVICE_URL}/probes/liveness`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      },
    );

    const duration = Date.now() - startTime;
    console.log(
      `⏱️  [${requestId}] PowerSync responded in ${duration}ms`,
    );
    console.log(
      `📊 [${requestId}] Response Status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] PowerSync health check failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `PowerSync health check failed: ${response.status} ${response.statusText}`,
      );
    }

    // Try to parse JSON response, but handle empty responses
    let data: any = {};
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      if (text && text.trim().length > 0) {
        data = JSON.parse(text);
      }
    }

    console.log(`✅ [${requestId}] PowerSync health check successful`);
    console.log(`📊 [${requestId}] Health data:`, data);
    console.log(`⏱️  [${requestId}] Total request time: ${duration}ms`);
    console.log("=".repeat(80));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(
      `❌ [${requestId}] PowerSync health check error after ${duration}ms:`,
    );
    console.error(`❌ [${requestId}] Error:`, error);

    if (error instanceof Error) {
      console.error(`❌ [${requestId}] Error stack:`, error.stack);

      if (error.name === "AbortError") {
        console.error(
          `⏰ [${requestId}] Request timeout - PowerSync took too long to respond`,
        );
        return NextResponse.json(
          {
            error: "PowerSync health check timeout",
            details: "Service took too long to respond",
            requestId,
          },
          { status: 504 },
        );
      }
    }

    console.error("=".repeat(80));

    return NextResponse.json(
      {
        error: "PowerSync health check failed",
        details: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 503 },
    );
  }
}
