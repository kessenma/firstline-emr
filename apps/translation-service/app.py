import hashlib
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging with more detailed format
logging.basicConfig(
    level=os.getenv("TRANSLATION_LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Load configuration from environment variables
TRANSLATION_API_KEY = os.getenv("TRANSLATION_API_KEY")
TRANSLATION_PORT = int(os.getenv("TRANSLATION_PORT", "9000"))
CACHE_MAX_SIZE = int(os.getenv("TRANSLATION_CACHE_MAX_SIZE", "1000"))
CACHE_EVICTION_TIME = int(
    os.getenv("TRANSLATION_CACHE_EVICTION_TIME", "259200")
)  # 3 days in seconds

# Log startup information
logger.info("=" * 80)
logger.info("🚀 Translation Service Starting...")
logger.info(f"📊 Log Level: {os.getenv('TRANSLATION_LOG_LEVEL', 'INFO')}")
logger.info(f"🐍 Python Version: {sys.version}")
logger.info(
    f"🔒 API Key Authentication: {'Enabled' if TRANSLATION_API_KEY else 'Disabled (WARNING!)'}"
)
logger.info(f"🌐 Port: {TRANSLATION_PORT}")
logger.info(f"💾 Cache Max Size: {CACHE_MAX_SIZE}")
logger.info(
    f"⏰ Cache Eviction Time: {CACHE_EVICTION_TIME}s ({CACHE_EVICTION_TIME // 86400} days)"
)
logger.info("=" * 80)

if not TRANSLATION_API_KEY:
    logger.warning(
        "⚠️  WARNING: No TRANSLATION_API_KEY set! Service is running without authentication!"
    )
    logger.warning(
        "⚠️  Set TRANSLATION_API_KEY environment variable for production deployments."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    # Startup
    logger.info("=" * 80)
    logger.info("🎉 Translation Service Started Successfully!")
    logger.info(f"🌐 Listening on port {TRANSLATION_PORT}")
    logger.info(
        f"🔒 API Key Authentication: {'Enabled ✓' if TRANSLATION_API_KEY else 'Disabled ⚠️'}"
    )
    logger.info(f"📊 Health check available at /health")
    logger.info(f"🔧 Translation endpoint available at /translate")
    logger.info("=" * 80)

    # Pre-load translation models on startup
    logger.info("🚀 Pre-loading translation models...")
    try:
        load_translation_models()
        logger.info("✅ Models pre-loaded successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to pre-load models: {e}")
        logger.warning(
            "⚠️  Service will attempt to load models on first translation request"
        )

    yield

    # Shutdown
    uptime = time.time() - SERVICE_START_TIME
    logger.info("=" * 80)
    logger.info("👋 Translation Service Shutting Down...")
    logger.info(f"⏱️  Total uptime: {uptime:.2f} seconds")
    logger.info(f"📊 Total translations cached: {len(translation_cache)}")
    logger.info("=" * 80)


app = FastAPI(
    title="Translation Service",
    version="1.0.0",
    description="Arabic-English translation service using Transformers",
    lifespan=lifespan,
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Language mappings
LANG_MAP = {"English": "eng_Latn", "Arabic": "ara_Arab"}
logger.info(f"📝 Language mappings configured: {LANG_MAP}")

# Cache for translations - stores (translation, timestamp, access_count)
translation_cache = {}
cache_stats = {
    "hits": 0,
    "misses": 0,
    "evictions": 0,
}


class TranslationRequest(BaseModel):
    text: str
    targetLang: str


class TranslationResponse(BaseModel):
    translatedText: str


class CacheStatsResponse(BaseModel):
    cache_size: int
    max_size: int
    eviction_time_seconds: int
    hits: int
    misses: int
    evictions: int
    hit_rate: float


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict
    uptime_seconds: float
    cache_size: int
    timestamp: str


# Global model loading status
MODEL_STATUS = {
    "ctranslate2_loaded": False,
    "transformers_ar_en_loaded": False,
    "transformers_en_ar_loaded": False,
    "any_model_loaded": False,
    "model_ar_en": None,
    "model_en_ar": None,
    "load_time_seconds": None,
}

# Model download progress tracking
MODEL_DOWNLOAD_PROGRESS = {
    "ar_en": {
        "status": "pending",  # pending, downloading, completed, error
        "progress_percent": 0,
        "downloaded_mb": 0,
        "total_mb": 0,
        "error": None,
    },
    "en_ar": {
        "status": "pending",
        "progress_percent": 0,
        "downloaded_mb": 0,
        "total_mb": 0,
        "error": None,
    },
}

# Track service start time
SERVICE_START_TIME = time.time()


def get_cache_key(text: str, source_lang: str, target_lang: str) -> str:
    """Generate cache key from text, source and target language."""
    content = f"{source_lang}:{target_lang}:{text}"
    return hashlib.md5(content.encode()).hexdigest()


def clean_cache():
    """Clean up expired and least-used cache entries."""
    current_time = time.time()
    expired_keys = []

    # Remove expired entries
    for key, (translation, timestamp, access_count) in list(translation_cache.items()):
        if current_time - timestamp > CACHE_EVICTION_TIME:
            expired_keys.append(key)
            del translation_cache[key]
            cache_stats["evictions"] += 1

    if expired_keys:
        logger.info(f"🧹 Cleaned {len(expired_keys)} expired cache entries")

    # If cache is still too large, remove least-used entries
    if len(translation_cache) > CACHE_MAX_SIZE:
        # Sort by access count (ascending) and remove oldest/least used
        sorted_items = sorted(
            translation_cache.items(),
            key=lambda x: (x[1][2], x[1][1]),  # Sort by access_count, then timestamp
        )

        excess = len(translation_cache) - CACHE_MAX_SIZE
        for i in range(excess):
            key = sorted_items[i][0]
            del translation_cache[key]
            cache_stats["evictions"] += 1

        logger.info(
            f"🧹 Removed {excess} least-used cache entries (size limit: {CACHE_MAX_SIZE})"
        )


# Background cache cleanup
import threading


def cache_cleanup_worker():
    while True:
        time.sleep(3600)  # Run every hour
        logger.debug("🧹 Running scheduled cache cleanup...")
        clean_cache()


threading.Thread(target=cache_cleanup_worker, daemon=True).start()
logger.info("🔄 Cache cleanup worker thread started")


# API Key validation function
def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """Verify the API key from request header."""
    # If no API key is configured, allow all requests (backward compatibility)
    if not TRANSLATION_API_KEY:
        return True

    # If API key is configured, require it in the header
    if not x_api_key:
        logger.warning("🚫 Request rejected: Missing X-API-Key header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header.",
        )

    if x_api_key != TRANSLATION_API_KEY:
        logger.warning(f"🚫 Request rejected: Invalid API key provided")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return True


# Translation models
translator_ar_en = None  # Arabic to English
translator_en_ar = None  # English to Arabic


# Function to load models on demand
def update_download_progress(
    model_key, status, progress=0, downloaded_mb=0, total_mb=0, error=None
):
    """Update the download progress for a specific model."""
    MODEL_DOWNLOAD_PROGRESS[model_key]["status"] = status
    MODEL_DOWNLOAD_PROGRESS[model_key]["progress_percent"] = progress
    MODEL_DOWNLOAD_PROGRESS[model_key]["downloaded_mb"] = round(downloaded_mb, 2)
    MODEL_DOWNLOAD_PROGRESS[model_key]["total_mb"] = round(total_mb, 2)
    MODEL_DOWNLOAD_PROGRESS[model_key]["error"] = error


def load_translation_models():
    global translator_ar_en, translator_en_ar

    if MODEL_STATUS["any_model_loaded"]:
        logger.info("✅ Models already loaded, skipping...")
        return

    logger.info("=" * 80)
    logger.info("📦 Loading translation models on demand...")
    logger.info("=" * 80)

    load_start = time.time()

    # Load Arabic to English model
    if not MODEL_STATUS["transformers_ar_en_loaded"]:
        try:
            logger.info(
                "📥 Loading Arabic→English model (Helsinki-NLP/opus-mt-ar-en)..."
            )
            logger.info("⏳ This may take a minute on first run...")

            # Update progress: downloading
            update_download_progress(
                "ar_en", "downloading", progress=0, downloaded_mb=0, total_mb=300
            )

            from transformers import pipeline

            translator_ar_en = pipeline(
                "translation",
                model="Helsinki-NLP/opus-mt-ar-en",
                device="cpu",
                max_length=512,
            )

            MODEL_STATUS["transformers_ar_en_loaded"] = True
            MODEL_STATUS["model_ar_en"] = "Helsinki-NLP/opus-mt-ar-en"

            # Update progress: completed
            update_download_progress(
                "ar_en", "completed", progress=100, downloaded_mb=300, total_mb=300
            )
            logger.info("✅ Arabic→English model loaded successfully!")

        except Exception as e:
            logger.error(f"❌ Arabic→English model failed to load: {e}")
            update_download_progress("ar_en", "error", error=str(e))

    # Load English to Arabic model
    if not MODEL_STATUS["transformers_en_ar_loaded"]:
        try:
            logger.info(
                "📥 Loading English→Arabic model (Helsinki-NLP/opus-mt-en-ar)..."
            )

            # Update progress: downloading
            update_download_progress(
                "en_ar", "downloading", progress=0, downloaded_mb=0, total_mb=300
            )

            from transformers import pipeline

            translator_en_ar = pipeline(
                "translation",
                model="Helsinki-NLP/opus-mt-en-ar",
                device="cpu",
                max_length=512,
            )

            MODEL_STATUS["transformers_en_ar_loaded"] = True
            MODEL_STATUS["model_en_ar"] = "Helsinki-NLP/opus-mt-en-ar"

            # Update progress: completed
            update_download_progress(
                "en_ar", "completed", progress=100, downloaded_mb=300, total_mb=300
            )
            logger.info("✅ English→Arabic model loaded successfully!")

        except Exception as e:
            logger.error(f"❌ English→Arabic model failed to load: {e}")
            update_download_progress("en_ar", "error", error=str(e))

    # Update overall status
    MODEL_STATUS["any_model_loaded"] = (
        MODEL_STATUS["transformers_ar_en_loaded"]
        or MODEL_STATUS["transformers_en_ar_loaded"]
    )
    MODEL_STATUS["load_time_seconds"] = round(time.time() - load_start, 2)

    if MODEL_STATUS["any_model_loaded"]:
        logger.info("=" * 80)
        logger.info("✅ Translation models loaded successfully!")
        logger.info(f"⏱️  Load time: {MODEL_STATUS['load_time_seconds']} seconds")
        logger.info(f"🤖 AR→EN: {MODEL_STATUS['model_ar_en']}")
        logger.info(f"🤖 EN→AR: {MODEL_STATUS['model_en_ar']}")
        logger.info("=" * 80)
    else:
        logger.error("❌ Failed to load any translation models")
        raise Exception("No translation models could be loaded")


# Simple langdetect import with fallback for basic detection
try:
    from langdetect import detect

    LANGDETECT_AVAILABLE = True
    logger.info("✅ Langdetect library available")
except ImportError:
    LANGDETECT_AVAILABLE = False
    logger.warning("⚠️  Langdetect not available - will use fallback language detection")


def detect_language_basic(text: str) -> str:
    """Basic language detection using character ranges."""
    # Arabic Unicode ranges
    arabic_chars = sum(
        1
        for c in text
        if "\u0600" <= c <= "\u06ff"
        or "\u0750" <= c <= "\u077f"
        or "\u08a0" <= c <= "\u08ff"
        or "\ufb50" <= c <= "\ufdff"
        or "\ufe70" <= c <= "\ufeff"
    )
    arabic_ratio = arabic_chars / len(text) if text else 0

    logger.debug(
        f"🔍 Arabic character detection: {arabic_chars}/{len(text)} chars ({arabic_ratio:.2%})"
    )

    if arabic_ratio > 0.3:  # If more than 30% Arabic characters
        return "ar"

    # Check for English characters
    english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    english_ratio = english_chars / len(text) if text else 0

    if english_ratio > 0.5:
        return "en"

    # Default to English
    return "en"


def detect_language(text: str) -> str:
    """Detect language with fallback."""
    if LANGDETECT_AVAILABLE:
        try:
            detected = detect(text)
            logger.debug(f"🔍 Langdetect result: {detected}")
            return detected
        except Exception as e:
            logger.warning(f"⚠️  Langdetect failed: {e}, using fallback")

    return detect_language_basic(text)


def fix_rtl_punctuation(text: str) -> str:
    """Fix punctuation for RTL languages."""
    return text.replace(".", "۔").replace(",", "،").replace(":", "：")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses."""
    request_id = hashlib.md5(f"{time.time()}".encode()).hexdigest()[:8]
    start_time = time.time()

    logger.info(
        f"📨 [{request_id}] {request.method} {request.url.path} - Request received"
    )

    try:
        response = await call_next(request)
        duration = time.time() - start_time

        logger.info(
            f"📤 [{request_id}] {request.method} {request.url.path} - "
            f"Status: {response.status_code} - Duration: {duration:.3f}s"
        )

        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"❌ [{request_id}] {request.method} {request.url.path} - "
            f"Error: {str(e)} - Duration: {duration:.3f}s"
        )
        raise


@app.post("/translate", response_model=TranslationResponse)
async def translate(
    request: TranslationRequest,
    api_key_valid: bool = Depends(verify_api_key),
):
    text = request.text
    target_lang = request.targetLang

    request_id = hashlib.md5(f"{text[:50]}{time.time()}".encode()).hexdigest()[:8]

    logger.info(
        f"🌐 [{request_id}] Translation request received (authenticated: {TRANSLATION_API_KEY is not None})"
    )
    logger.info(f"📝 [{request_id}] Target language: {target_lang}")
    logger.info(f"📏 [{request_id}] Text length: {len(text)} characters")
    logger.debug(f"💬 [{request_id}] Text preview: {text[:100]}...")

    if not text or len(text.strip()) == 0:
        logger.warning(f"⚠️  [{request_id}] Empty text provided")
        raise HTTPException(status_code=400, detail="No text to translate provided")

    if target_lang not in LANG_MAP:
        logger.warning(f"⚠️  [{request_id}] Invalid target language: {target_lang}")
        raise HTTPException(
            status_code=400, detail=f"Invalid target language: {target_lang}"
        )

    # Load models on demand if not already loaded
    if not MODEL_STATUS["any_model_loaded"]:
        logger.info(f"🔧 [{request_id}] Loading translation models on first request...")
        try:
            load_translation_models()
        except Exception as e:
            logger.error(f"❌ [{request_id}] Failed to load models: {e}")
            raise HTTPException(
                status_code=503,
                detail="Translation service unavailable - failed to load models",
            )

    # Detect source language
    detected_lang = detect_language(text)
    logger.info(f"🔍 [{request_id}] Detected language: {detected_lang}")

    # Determine source language string for cache key
    source_lang = "Arabic" if detected_lang == "ar" else "English"

    # Check cache
    cache_key = get_cache_key(text, source_lang, target_lang)
    if cache_key in translation_cache:
        cached_translation, cached_time, access_count = translation_cache[cache_key]
        cache_age = time.time() - cached_time

        # Update access count
        translation_cache[cache_key] = (
            cached_translation,
            cached_time,
            access_count + 1,
        )
        cache_stats["hits"] += 1

        logger.info(
            f"✅ [{request_id}] Cache hit! Age: {cache_age:.1f}s, Access count: {access_count + 1}"
        )
        logger.debug(
            f"💬 [{request_id}] Cached translation: {cached_translation[:100]}..."
        )
        return TranslationResponse(translatedText=cached_translation)

    cache_stats["misses"] += 1
    logger.info(f"🔄 [{request_id}] Cache miss - proceeding with translation")

    try:
        translation = None
        translation_start = time.time()

        # Translate based on detected language and target
        if detected_lang == "ar" and target_lang == "English":
            # Arabic to English
            logger.info(f"🔄 [{request_id}] Translating Arabic → English")

            if not MODEL_STATUS["transformers_ar_en_loaded"]:
                raise HTTPException(
                    status_code=503,
                    detail="Arabic→English model not loaded",
                )

            try:
                logger.debug(f"🤖 [{request_id}] Calling AR→EN transformer model...")
                result = translator_ar_en(text)[0]["translation_text"]
                translation = result

                translation_duration = time.time() - translation_start
                logger.info(
                    f"✅ [{request_id}] Translation completed in {translation_duration:.3f}s"
                )
                logger.info(f"📤 [{request_id}] Original: {text[:100]}...")
                logger.info(f"📥 [{request_id}] Translated: {translation[:100]}...")

            except Exception as trans_error:
                logger.error(f"❌ [{request_id}] Translation failed: {trans_error}")
                logger.exception(trans_error)
                raise HTTPException(
                    status_code=500,
                    detail=f"Translation failed during processing: {str(trans_error)}",
                )

        elif detected_lang == "en" and target_lang == "Arabic":
            # English to Arabic
            logger.info(f"🔄 [{request_id}] Translating English → Arabic")

            if not MODEL_STATUS["transformers_en_ar_loaded"]:
                raise HTTPException(
                    status_code=503,
                    detail="English→Arabic model not loaded",
                )

            try:
                logger.debug(f"🤖 [{request_id}] Calling EN→AR transformer model...")
                result = translator_en_ar(text)[0]["translation_text"]
                translation = result

                translation_duration = time.time() - translation_start
                logger.info(
                    f"✅ [{request_id}] Translation completed in {translation_duration:.3f}s"
                )
                logger.info(f"📤 [{request_id}] Original: {text[:100]}...")
                logger.info(f"📥 [{request_id}] Translated: {translation[:100]}...")

            except Exception as trans_error:
                logger.error(f"❌ [{request_id}] Translation failed: {trans_error}")
                logger.exception(trans_error)
                raise HTTPException(
                    status_code=500,
                    detail=f"Translation failed during processing: {str(trans_error)}",
                )
        else:
            # Source and target are the same or unsupported direction
            logger.info(
                f"ℹ️  [{request_id}] Same language detected ({detected_lang} → {target_lang}), returning as-is"
            )
            translation = text

        # Cache the result with access count
        translation_cache[cache_key] = (translation, time.time(), 1)
        logger.info(
            f"💾 [{request_id}] Translation cached (cache size: {len(translation_cache)}/{CACHE_MAX_SIZE})"
        )

        return TranslationResponse(translatedText=translation)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [{request_id}] Unexpected translation error: {e}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health(api_key_valid: bool = Depends(verify_api_key)):
    """Health check endpoint with detailed status."""
    uptime = time.time() - SERVICE_START_TIME

    health_status = {
        "status": "healthy" if MODEL_STATUS["any_model_loaded"] else "loading",
        "models_loaded": MODEL_STATUS,
        "uptime_seconds": round(uptime, 2),
        "cache_size": len(translation_cache),
        "timestamp": datetime.now(UTC).isoformat(),
        "config": {
            "port": TRANSLATION_PORT,
            "cache_max_size": CACHE_MAX_SIZE,
            "cache_eviction_time_seconds": CACHE_EVICTION_TIME,
        },
        "download_progress": MODEL_DOWNLOAD_PROGRESS,
    }

    logger.debug(
        f"🏥 Health check: {health_status['status']} - Uptime: {uptime:.1f}s - Cache: {len(translation_cache)}/{CACHE_MAX_SIZE}"
    )

    return health_status


@app.get("/cache/stats", response_model=CacheStatsResponse)
async def get_cache_stats(api_key_valid: bool = Depends(verify_api_key)):
    """Get detailed cache statistics."""
    total_requests = cache_stats["hits"] + cache_stats["misses"]
    hit_rate = (cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0

    return CacheStatsResponse(
        cache_size=len(translation_cache),
        max_size=CACHE_MAX_SIZE,
        eviction_time_seconds=CACHE_EVICTION_TIME,
        hits=cache_stats["hits"],
        misses=cache_stats["misses"],
        evictions=cache_stats["evictions"],
        hit_rate=round(hit_rate, 2),
    )


@app.post("/cache/clear")
async def clear_cache(api_key_valid: bool = Depends(verify_api_key)):
    """Clear the translation cache."""
    cache_size_before = len(translation_cache)
    translation_cache.clear()

    # Reset stats
    cache_stats["hits"] = 0
    cache_stats["misses"] = 0
    cache_stats["evictions"] = 0

    logger.info(f"🧹 Cache cleared: {cache_size_before} entries removed")

    return {
        "status": "success",
        "message": f"Cache cleared successfully",
        "entries_removed": cache_size_before,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/cache/cleanup")
async def trigger_cache_cleanup(api_key_valid: bool = Depends(verify_api_key)):
    """Manually trigger cache cleanup (removes expired and excess entries)."""
    cache_size_before = len(translation_cache)
    clean_cache()
    cache_size_after = len(translation_cache)
    entries_removed = cache_size_before - cache_size_after

    logger.info(f"🧹 Manual cache cleanup: {entries_removed} entries removed")

    return {
        "status": "success",
        "message": f"Cache cleanup completed",
        "entries_removed": entries_removed,
        "cache_size": cache_size_after,
        "max_size": CACHE_MAX_SIZE,
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    logger.info("🚀 Starting uvicorn server...")
    uvicorn.run(
        app, host="0.0.0.0", port=TRANSLATION_PORT, log_level="info", access_log=True
    )
