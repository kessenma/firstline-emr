// apps/web/app/api/translation/health/route.ts
import { NextResponse } from "next/server";

const TRANSLATION_SERVICE_URL =
  process.env.TRANSLATION_SERVICE_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://translation-service:9000"
    : "http://localhost:9000");
const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY;

export async function GET() {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log("=".repeat(80));
  console.log(`🏥 [${requestId}] Translation service health check requested`);
  console.log(`📡 [${requestId}] URL: ${TRANSLATION_SERVICE_URL}/health`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (TRANSLATION_API_KEY) {
      headers["X-API-Key"] = TRANSLATION_API_KEY;
      console.log(`🔑 [${requestId}] Using API key for authentication`);
    }

    const response = await fetch(`${TRANSLATION_SERVICE_URL}/health`, {
      method: "GET",
      headers,
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const duration = Date.now() - startTime;
    console.log(
      `⏱️  [${requestId}] Health check responded in ${duration}ms`,
    );
    console.log(
      `📊 [${requestId}] Response Status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Health check failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: "Translation service unhealthy",
          status: "unhealthy",
          details: errorText,
          duration,
          timestamp: new Date().toISOString(),
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Health check successful`);
    console.log(`📊 [${requestId}] Service status:`, data.status);
    console.log(`⏱️  [${requestId}] Total request time: ${duration}ms`);
    console.log("=".repeat(80));

    return NextResponse.json({
      ...data,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`❌ [${requestId}] Health check error after ${duration}ms:`);
    console.error(`❌ [${requestId}] Error:`, error);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(
          `⏰ [${requestId}] Request timeout - service took too long to respond`,
        );
        return NextResponse.json(
          {
            error: "Health check timeout - service took too long to respond",
            status: "timeout",
            duration,
            timestamp: new Date().toISOString(),
          },
          { status: 504 },
        );
      }
      console.error(`❌ [${requestId}] Error name: ${error.name}`);
      console.error(`❌ [${requestId}] Error message: ${error.message}`);
    }

    console.error("=".repeat(80));

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check translation service health",
        status: "error",
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
