# Translation Service - Environment Variables Configuration

This document explains all environment variables needed for the translation service to work properly across both the translation service container and the web application container.

## Overview

The translation service architecture involves two separate containers:
1. **Translation Service Container** (`translation-service`) - Python FastAPI service
2. **Web Application Container** (`web`) - Next.js application

They communicate via Docker's internal network (`coolify`).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Client-Side)                                       │
│  - Cannot access internal Docker network                    │
│  - Makes requests to web app's API routes                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP Request
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Web App Container (Next.js)                                 │
│  Port: 3000 (external)                                      │
│  Network: coolify                                           │
│                                                             │
│  Frontend (React):                                          │
│   ├─ /admin/translation-service                            │
│   └─ Calls → /api/translation/*                            │
│                                                             │
│  Backend (API Routes):                                      │
│   ├─ /api/translation/health                               │
│   ├─ /api/translation/cache/stats                          │
│   ├─ /api/translation/cache/clear                          │
│   └─ /api/translate                                         │
│        │                                                    │
│        │ Uses: TRANSLATION_SERVICE_URL                      │
│        │       TRANSLATION_API_KEY                          │
│        ↓                                                    │
└────────┼────────────────────────────────────────────────────┘
         │ Internal Docker Network Request
         │ http://translation-service:9000
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Translation Service Container (Python/FastAPI)              │
│  Port: 9000 (internal + external)                          │
│  Network: coolify                                           │
│  Service Name: translation-service                          │
│                                                             │
│  Endpoints:                                                 │
│   ├─ GET  /health                                           │
│   ├─ POST /translate                                        │
│   ├─ GET  /cache/stats                                      │
│   ├─ POST /cache/clear                                      │
│   └─ POST /cache/cleanup                                    │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Translation Service Container

Set these in `docker-compose.translation.yml` and your `.env` file:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRANSLATION_API_KEY` | ✅ Yes | (none) | API key for authentication |
| `TRANSLATION_PORT` | No | `9000` | Port the service listens on |
| `TRANSLATION_LOG_LEVEL` | No | `INFO` | Logging verbosity (DEBUG, INFO, WARNING, ERROR) |
| `TRANSLATION_CACHE_MAX_SIZE` | No | `1000` | Maximum number of cached translations |
| `TRANSLATION_CACHE_EVICTION_TIME` | No | `259200` | Cache TTL in seconds (3 days) |
| `PYTHONUNBUFFERED` | No | `1` | Python output buffering |
| `NODE_ENV` | No | `production` | Environment mode |

**Example `.env`:**
```bash
# Translation Service Configuration
TRANSLATION_API_KEY=<REDACTED-generate-with-openssl-rand-hex-32>
TRANSLATION_PORT=9000
TRANSLATION_LOG_LEVEL=INFO
TRANSLATION_CACHE_MAX_SIZE=1000
TRANSLATION_CACHE_EVICTION_TIME=259200
```

### Web Application Container

Set these in `docker-compose.web.yml` and your `.env` file:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRANSLATION_SERVICE_URL` | ✅ Yes | `http://translation-service:9000` | Internal Docker URL to translation service |
| `TRANSLATION_API_KEY` | ✅ Yes | (none) | API key (must match translation service) |
| `TRANSLATION_PORT` | No | `9000` | Port used for display purposes |

**Example `.env`:**
```bash
# Translation Service Integration (Web App)
TRANSLATION_SERVICE_URL=http://translation-service:9000
TRANSLATION_API_KEY=<REDACTED-generate-with-openssl-rand-hex-32>
TRANSLATION_PORT=9000
```

## Important Notes

### 🔐 Security

1. **Same API Key Required**: Both services must use the **exact same** `TRANSLATION_API_KEY`
2. **Keep it Secret**: Never commit API keys to version control
3. **Strong Keys**: Use a secure random key (32+ characters)

Generate a secure key:
```bash
openssl rand -hex 32
```

### 🌐 Network Communication

**Internal vs External URLs:**

- **Internal (Docker network)**: `http://translation-service:9000`
  - Used by: Web app's API routes
  - Works: Inside Docker network only
  - Fast: No external routing

- **External (Public access)**: `http://your-domain.com:9000` or `http://IP:9000`
  - Used by: External monitoring tools (optional)
  - Works: From internet if port exposed
  - Requires: Port 9000 exposed in docker-compose

### 📍 Service Discovery

Docker Compose automatically creates DNS entries:
- Service name: `translation-service` (from docker-compose.translation.yml)
- Resolves to: Internal container IP
- Accessible from: Any container on `coolify` network

### ❌ Common Mistakes

**1. Using `localhost` in web app:**
```bash
# ❌ WRONG - localhost refers to web container, not translation service
TRANSLATION_SERVICE_URL=http://localhost:9000

# ✅ CORRECT - use Docker service name
TRANSLATION_SERVICE_URL=http://translation-service:9000
```

**2. Trying to use `NEXT_PUBLIC_*` for internal URLs:**
```typescript
// ❌ WRONG - exposes internal Docker URLs to browser
const url = process.env.NEXT_PUBLIC_TRANSLATION_SERVICE_URL;

// ✅ CORRECT - browser calls API routes, which use internal URL
const response = await fetch('/api/translation/health');
```

**3. Mismatched API keys:**
```bash
# Translation service .env
TRANSLATION_API_KEY=abc123

# Web app .env
TRANSLATION_API_KEY=xyz789  # ❌ WRONG - must match!
```

**4. Wrong network:**
```yaml
# ❌ WRONG - services on different networks can't communicate
networks:
  - my-custom-network  # Translation service
  - coolify           # Web app

# ✅ CORRECT - both on same network
networks:
  - coolify
```

## Configuration Files

### docker-compose.translation.yml

```yaml
version: "3.8"

services:
  translation-service:
    build:
      context: ./apps/translation-service
      dockerfile: Dockerfile
    restart: always
    environment:
      PYTHONUNBUFFERED: "1"
      NODE_ENV: ${NODE_ENV:-production}
      TRANSLATION_LOG_LEVEL: ${TRANSLATION_LOG_LEVEL:-INFO}
      TRANSLATION_API_KEY: ${TRANSLATION_API_KEY:?TRANSLATION_API_KEY is required}
      TRANSLATION_PORT: "9000"
      TRANSLATION_CACHE_MAX_SIZE: ${TRANSLATION_CACHE_MAX_SIZE:-1000}
      TRANSLATION_CACHE_EVICTION_TIME: ${TRANSLATION_CACHE_EVICTION_TIME:-259200}
    ports:
      - "9000:9000"  # Expose to host (optional)
    volumes:
      - translation-models:/root/.cache/huggingface
    networks:
      - coolify  # Must be on same network as web app

volumes:
  translation-models:
    driver: local

networks:
  coolify:
    name: coolify
    external: true
```

### docker-compose.web.yml

```yaml
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        TRANSLATION_SERVICE_URL: ${TRANSLATION_SERVICE_URL:-http://translation-service:9000}
        TRANSLATION_PORT: ${TRANSLATION_PORT:-9000}
        TRANSLATION_API_KEY: ${TRANSLATION_API_KEY}
    environment:
      TRANSLATION_SERVICE_URL: ${TRANSLATION_SERVICE_URL:-http://translation-service:9000}
      TRANSLATION_PORT: ${TRANSLATION_PORT:-9000}
      TRANSLATION_API_KEY: ${TRANSLATION_API_KEY}
    ports:
      - "${PORT_ENV}:${PORT_ENV}"
    networks:
      - coolify  # Must be on same network as translation service

networks:
  coolify:
    name: coolify
    external: true
```

## Usage in Code

### Web App API Route (Server-Side)

```typescript
// apps/web/app/api/translation/health/route.ts
const TRANSLATION_SERVICE_URL =
  process.env.TRANSLATION_SERVICE_URL || "http://translation-service:9000";
const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY;

export async function GET() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (TRANSLATION_API_KEY) {
    headers["X-API-Key"] = TRANSLATION_API_KEY;
  }

  const response = await fetch(`${TRANSLATION_SERVICE_URL}/health`, {
    method: "GET",
    headers,
  });

  return NextResponse.json(await response.json());
}
```

### React Component (Client-Side)

```typescript
// apps/web/components/adminDashboard/sections/translation-service/useTranslationServiceViewModel.ts

// Display URL only (not used for actual requests)
const serviceUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:9000`
    : "http://translation-service:9000";

// Actual API call - goes to Next.js API route, not translation service directly
const checkHealth = async () => {
  const response = await fetch("/api/translation/health", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  return await response.json();
};
```

## Testing Connectivity

### From Web Container to Translation Service

```bash
# Shell into web container
docker exec -it <web-container-id> sh

# Test DNS resolution
nslookup translation-service

# Test HTTP connection
curl -H "X-API-Key: your-api-key-here" http://translation-service:9000/health
```

### From Host Machine

```bash
# Test external port (if exposed)
curl -H "X-API-Key: your-api-key-here" http://localhost:9000/health

# Or with your server IP
curl -H "X-API-Key: your-api-key-here" http://your-server-ip:9000/health
```

### From Browser Console

```javascript
// Test the Next.js API route (client → server → translation service)
fetch('/api/translation/health')
  .then(r => r.json())
  .then(data => console.log(data));
```

## Coolify Deployment

### Setting Environment Variables in Coolify

1. **Navigate to your service** (translation-service or web)
2. **Click "Environment Variables"**
3. **Add each variable**:
   - Name: `TRANSLATION_API_KEY`
   - Value: `your-secure-key-here`
   - Mark as "Secret" ✓

4. **Important variables for both services**:
   - `TRANSLATION_API_KEY` (same value for both!)
   - `TRANSLATION_SERVICE_URL` (web only)
   - `TRANSLATION_PORT` (optional, defaults to 9000)

### Deployment Order

1. **Deploy translation service first**
   - Wait for it to become healthy (may take 5 minutes on first deploy)
   - Check logs: `docker logs -f <container-id>`

2. **Deploy web app second**
   - It will connect to already-running translation service
   - Faster startup since translation service is ready

## Troubleshooting

### "Connection Refused" Error

**Symptoms:**
```
Error: connect ECONNREFUSED translation-service:9000
```

**Causes & Solutions:**
- ❌ Translation service not running → Check `docker ps`
- ❌ Wrong network → Both must be on `coolify` network
- ❌ Wrong port → Check `TRANSLATION_PORT` is 9000
- ❌ Service name typo → Must be exact: `translation-service`

### "Unauthorized" / 401 Error

**Symptoms:**
```
Error: Unauthorized - Invalid API key
```

**Causes & Solutions:**
- ❌ Missing API key → Set `TRANSLATION_API_KEY`
- ❌ Mismatched keys → Keys must be identical in both services
- ❌ Key not passed → Check headers include `X-API-Key`

### Service Unavailable / 503 Error

**Symptoms:**
```
Error: Service Unavailable
```

**Causes & Solutions:**
- ❌ Models still downloading → Wait 5 minutes on first startup
- ❌ Health check failing → Check translation service logs
- ❌ Container restarting → Check resource limits (RAM/CPU)

### Wrong URL in Logs

**Symptoms:**
```
📡 URL: http://localhost:9000/health  ❌ WRONG
```

**Solution:**
```bash
# Update environment variable
TRANSLATION_SERVICE_URL=http://translation-service:9000
```

## Best Practices

1. ✅ **Use environment variables** for all configuration
2. ✅ **Keep API keys secret** - never commit to git
3. ✅ **Use Docker service names** for internal communication
4. ✅ **Test connectivity** before deploying to production
5. ✅ **Monitor logs** during first deployment
6. ✅ **Document custom values** in your team's runbook

## Related Documentation

- [TRANSLATION_MODEL_LOADING.md](./TRANSLATION_MODEL_LOADING.md) - Model download timing
- [TRANSLATION_DOWNLOAD_PROGRESS.md](./TRANSLATION_DOWNLOAD_PROGRESS.md) - Progress tracking
- [TRANSLATION_CONFIG_DISPLAY.md](./TRANSLATION_CONFIG_DISPLAY.md) - Configuration UI
- [apps/translation-service/README.md](./apps/translation-service/README.md) - Full service docs

---

**Last Updated:** 2025-01-15  
**Version:** 1.0.0  
**Status:** ✅ Production Ready