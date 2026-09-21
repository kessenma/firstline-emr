// apps/web/app/api/translate/route.ts
import { NextRequest, NextResponse } from "next/server";
import murmurHash3 from "murmurhash3js";

// Translation service URL (internal Docker network)
// IMPORTANT: Port should be 9000, not 8000
// In development, use localhost; in production, use Docker service name
const TRANSLATION_SERVICE_URL =
  process.env.TRANSLATION_SERVICE_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://translation-service:9000"
    : "http://localhost:9000");

// API Key for translation service authentication
const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY;

console.log("=".repeat(80));
console.log("🌐 Translation API Route Initialized");
console.log(`📡 Translation Service URL: ${TRANSLATION_SERVICE_URL}`);
console.log(
  `🔒 API Key Authentication: ${TRANSLATION_API_KEY ? "Enabled ✓" : "Disabled ⚠️"}`,
);
console.log("=".repeat(80));

if (!TRANSLATION_API_KEY) {
  console.warn(
    "⚠️  WARNING: TRANSLATION_API_KEY not set! Translation service may reject requests if authentication is enabled.",
  );
}

interface CacheEntry {
  translation: string | null;
  lastAccessed: number; // Timestamp of last access
}

// Language mappings
const langMap = { English: "en", Arabic: "ar" } as const;

const translateCache = {
  en: new Map<number, CacheEntry>(),
  ar: new Map<number, CacheEntry>(),
};

type LangKey = keyof typeof langMap;

const EVICTION_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days in ms.

// Background task: Periodically clean up old cache entries
setInterval(
  () => {
    const now = Date.now();
    let totalCleaned = 0;

    for (const [lang, map] of Object.entries(translateCache)) {
      const sizeBefore = map.size;
      for (const [hash, entry] of map.entries()) {
        if (now - entry.lastAccessed > EVICTION_TIME) {
          map.delete(hash);
        }
      }
      const cleaned = sizeBefore - map.size;
      totalCleaned += cleaned;
    }

    if (totalCleaned > 0) {
      console.log(
        `🧹 Cache cleanup completed. Removed ${totalCleaned} entries.`,
      );
      console.log("📊 Current cache sizes:", {
        en: translateCache.en.size,
        ar: translateCache.ar.size,
      });
    }
  },
  60 * 60 * 1000,
); // Runs every 1 hour

async function callTranslationService(
  text: string,
  targetLang: string,
  requestId: string,
): Promise<string> {
  const startTime = Date.now();

  console.log(`🔄 [${requestId}] Calling translation service...`);
  console.log(`📡 [${requestId}] URL: ${TRANSLATION_SERVICE_URL}/translate`);
  console.log(`📝 [${requestId}] Target Language: ${targetLang}`);
  console.log(`📏 [${requestId}] Text Length: ${text.length} characters`);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (TRANSLATION_API_KEY) {
      headers["X-API-Key"] = TRANSLATION_API_KEY;
      console.log(`🔑 [${requestId}] Using API key for authentication`);
    }

    const response = await fetch(`${TRANSLATION_SERVICE_URL}/translate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, targetLang }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;
    console.log(
      `⏱️  [${requestId}] Translation service responded in ${duration}ms`,
    );
    console.log(
      `📊 [${requestId}] Response Status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Translation service error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Translation service error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    console.log(`✅ [${requestId}] Translation successful`);
    console.log(`📤 [${requestId}] Original: ${text.substring(0, 100)}...`);
    console.log(
      `📥 [${requestId}] Translated: ${data.translatedText?.substring(0, 100)}...`,
    );

    return data.translatedText;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `❌ [${requestId}] Translation service call failed after ${duration}ms:`,
      error,
    );

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(
          `⏰ [${requestId}] Request timeout - translation service took too long to respond`,
        );
        throw new Error(
          "Translation request timeout - service took too long to respond",
        );
      }
      console.error(`❌ [${requestId}] Error name: ${error.name}`);
      console.error(`❌ [${requestId}] Error message: ${error.message}`);
    }

    throw error;
  }
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log("=".repeat(80));
  console.log(`📨 [${requestId}] Translation request received`);

  try {
    const body = await req.json();
    const { text, targetLang } = body;

    console.log(`📋 [${requestId}] Request details:`, {
      textLength: text?.length || 0,
      targetLang,
      hasText: !!text,
    });

    // Validation
    if (!text || text.length === 0) {
      console.warn(`⚠️  [${requestId}] Empty text provided`);
      return NextResponse.json(
        { error: "No text to translate provided." },
        { status: 400 },
      );
    }

    if (typeof text !== "string") {
      console.warn(`⚠️  [${requestId}] Invalid text type: ${typeof text}`);
      return NextResponse.json(
        { error: "Invalid text provided." },
        { status: 400 },
      );
    }

    if (targetLang && !(targetLang in langMap)) {
      console.warn(`⚠️  [${requestId}] Invalid target language: ${targetLang}`);
      return NextResponse.json(
        { error: `Invalid target language: ${targetLang}` },
        { status: 400 },
      );
    }

    const cacheKey = langMap[(targetLang as LangKey) || "English"];
    const textHash = murmurHash3.x86.hash32(text);

    // Check cache first
    if (translateCache[cacheKey].has(textHash)) {
      const entry = translateCache[cacheKey].get(textHash);
      if (entry) {
        const cacheAge = Date.now() - entry.lastAccessed;
        console.log(`✅ [${requestId}] Cache hit! Age: ${cacheAge}ms`);
        entry.lastAccessed = Date.now();

        const duration = Date.now() - startTime;
        console.log(`⏱️  [${requestId}] Total request time: ${duration}ms`);
        console.log("=".repeat(80));

        return NextResponse.json(
          { translatedText: entry.translation || text },
          { status: 200 },
        );
      }
    }

    console.log(`🔍 [${requestId}] Cache miss - calling translation service`);

    // Call the translation service
    const translatedText = await callTranslationService(
      text,
      targetLang,
      requestId,
    );

    // Cache the result
    translateCache[cacheKey].set(textHash, {
      translation: translatedText,
      lastAccessed: Date.now(),
    });

    console.log(`💾 [${requestId}] Translation cached`);
    console.log(
      `📊 [${requestId}] Cache size (${cacheKey}): ${translateCache[cacheKey].size}`,
    );

    const duration = Date.now() - startTime;
    console.log(`⏱️  [${requestId}] Total request time: ${duration}ms`);
    console.log(`✅ [${requestId}] Translation request completed successfully`);
    console.log("=".repeat(80));

    return NextResponse.json({ translatedText }, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`❌ [${requestId}] Translation error after ${duration}ms:`);
    console.error(`❌ [${requestId}] Error:`, error);

    if (error instanceof Error) {
      console.error(`❌ [${requestId}] Error stack:`, error.stack);
    }

    console.error("=".repeat(80));

    return NextResponse.json(
      {
        error: "An error occurred during translation.",
        details: error instanceof Error ? error.message : "Unknown error",
        requestId,
      },
      { status: 500 },
    );
  }
}

function fixRtlPunctuation(text: string): string {
  return text
    .replace(/\./g, "۔") // Arabic full stop
    .replace(/,/g, "،") // Arabic comma
    .replace(/:/g, "："); // Arabic colon
}
