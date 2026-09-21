// apps/web/app/api/translation/cache/stats/route.ts
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
  console.log(`📊 [${requestId}] Cache stats request`);
  console.log(`📡 [${requestId}] URL: ${TRANSLATION_SERVICE_URL}/cache/stats`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (TRANSLATION_API_KEY) {
      headers["X-API-Key"] = TRANSLATION_API_KEY;
      console.log(`🔑 [${requestId}] Using API key for authentication`);
    }

    const response = await fetch(`${TRANSLATION_SERVICE_URL}/cache/stats`, {
      method: "GET",
      headers,
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const duration = Date.now() - startTime;
    console.log(
      `⏱️  [${requestId}] Cache stats responded in ${duration}ms`,
    );
    console.log(
      `📊 [${requestId}] Response Status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Cache stats request failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: "Failed to fetch cache stats",
          details: errorText,
          duration,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Cache stats retrieved successfully`);
    console.log(`📊 [${requestId}] Cache size: ${data.cache_size}/${data.max_size}`);
    console.log(`📊 [${requestId}] Hit rate: ${data.hit_rate}%`);
    console.log(`⏱️  [${requestId}] Total request time: ${duration}ms`);
    console.log("=".repeat(80));

    return NextResponse.json({
      ...data,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`❌ [${requestId}] Cache stats error after ${duration}ms:`);
    console.error(`❌ [${requestId}] Error:`, error);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(
          `⏰ [${requestId}] Request timeout - service took too long to respond`,
        );
        return NextResponse.json(
          {
            error: "Cache stats request timeout",
            duration,
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
        error: "Failed to fetch cache stats",
        details: error instanceof Error ? error.message : "Unknown error",
        duration,
      },
      { status: 503 },
    );
  }
}
