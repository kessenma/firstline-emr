# Translation Service Configuration Display

This document describes the configuration display feature added to the Translation Service admin dashboard.

## Overview

The translation service now exposes its runtime configuration through the health endpoint, and the admin dashboard displays these values in a human-readable format.

## Configuration Values Exposed

### 1. Service Port (`TRANSLATION_PORT`)
- **Default:** 9000
- **Description:** The port the translation service listens on
- **Environment Variable:** `TRANSLATION_PORT`
- **Display:** Shows as a large number in the Configuration card

### 2. Maximum Cache Size (`TRANSLATION_CACHE_MAX_SIZE`)
- **Default:** 1000
- **Description:** Maximum number of translations to cache in memory
- **Environment Variable:** `TRANSLATION_CACHE_MAX_SIZE`
- **Display:** Shows with thousand separators (e.g., "1,000")

### 3. Cache Eviction Time / TTL (`TRANSLATION_CACHE_EVICTION_TIME`)
- **Default:** 259200 seconds (3 days)
- **Description:** Time-to-live for cached translations before automatic eviction
- **Environment Variable:** `TRANSLATION_CACHE_EVICTION_TIME`
- **Display:** Converted to human-readable format (e.g., "3 days")

## Human-Readable Time Formatting

The `formatDuration()` helper function converts seconds to readable durations:

| Seconds | Display |
|---------|---------|
| 60 | 1 minute |
| 3600 | 1 hour |
| 86400 | 1 day |
| 259200 | 3 days |
| 604800 | 7 days |
| 345600 | 4 days, 2 hours |

### Format Rules:
- Shows days + hours if duration is > 1 day and has remaining hours
- Shows hours + minutes if duration is > 1 hour and has remaining minutes
- Shows minutes if duration is > 1 minute
- Shows seconds for durations < 1 minute
- Automatically pluralizes (e.g., "1 day" vs "2 days")

## API Response Structure

### Health Endpoint (`/health`)

```json
{
  "status": "healthy",
  "models_loaded": { ... },
  "uptime_seconds": 12345.67,
  "cache_size": 42,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "config": {
    "port": 9000,
    "cache_max_size": 1000,
    "cache_eviction_time_seconds": 259200
  }
}
```

The `config` object is a new addition that provides runtime configuration values.

## UI Components

### Configuration Card

Located in the "Monitoring" tab of the Translation Service admin section:

```
┌─────────────────────────────────────────────────────┐
│ Configuration                                       │
│ Current service configuration settings              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🖥️ Service Port    💾 Max Cache Size    ⏰ Cache TTL │
│     9000              1,000                3 days   │
│  TRANSLATION_PORT  TRANSLATION_CACHE...  TRANSLAT...│
│                                                     │
│  ℹ️ These values are loaded from environment        │
│     variables when the service starts. To change    │
│     them, update your .env file and restart the     │
│     service.                                        │
└─────────────────────────────────────────────────────┘
```

### Features:
- **Icons:** Visual indicators for each configuration type (Server, Database, Clock)
- **Large numbers:** Main values displayed prominently
- **Environment variable names:** Shows which env var controls each setting
- **Info banner:** Explains how to modify these values
- **Responsive grid:** 3 columns on desktop, stacks on mobile

## Code Changes

### Backend (`apps/translation-service/app.py`)

```python
# Health endpoint now includes config
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
}
```

### Frontend (TypeScript)

**Type Definition:**
```typescript
interface HealthData {
  status: string;
  models_loaded: ModelStatus;
  uptime_seconds: number;
  cache_size: number;
  timestamp: string;
  config?: {
    port: number;
    cache_max_size: number;
    cache_eviction_time_seconds: number;
  };
}
```

**Formatter Function:**
```typescript
const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    if (hours > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    if (minutes > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} min`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};
```

## Docker Configuration

### Dockerfile Updates

The Dockerfile now uses `TRANSLATION_PORT` as a build argument and environment variable:

```dockerfile
# Expose port (configurable via TRANSLATION_PORT, defaults to 9000)
ARG TRANSLATION_PORT=9000
EXPOSE ${TRANSLATION_PORT}

# Environment variable for runtime
ENV TRANSLATION_PORT=${TRANSLATION_PORT}

# Health check using environment variable and API key
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f -H "X-API-Key: ${TRANSLATION_API_KEY}" http://localhost:${TRANSLATION_PORT}/health || exit 1
```

### docker-compose.yml

The port is currently fixed at 9000 for consistency:

```yaml
environment:
  TRANSLATION_PORT: "9000"
  TRANSLATION_CACHE_MAX_SIZE: ${TRANSLATION_CACHE_MAX_SIZE:-1000}
  TRANSLATION_CACHE_EVICTION_TIME: ${TRANSLATION_CACHE_EVICTION_TIME:-259200}
ports:
  - "9000:9000"
```

## Benefits

1. **Transparency:** Admins can see exactly how the service is configured
2. **Troubleshooting:** Easier to diagnose issues related to cache size or TTL
3. **Documentation:** UI serves as live documentation of current settings
4. **User-Friendly:** Seconds converted to days/hours for easy understanding
5. **No Guesswork:** No need to check .env files or logs to see configuration

## Future Enhancements

Potential improvements:
- Add ability to modify configuration from UI (with service restart)
- Show recommended values based on usage patterns
- Add configuration history/change log
- Display memory usage related to cache size
- Add validation warnings (e.g., "Cache size too small for your usage")

## Testing

To test the configuration display:

1. **Start the service** with custom values:
   ```bash
   TRANSLATION_PORT=9000 \
   TRANSLATION_CACHE_MAX_SIZE=5000 \
   TRANSLATION_CACHE_EVICTION_TIME=604800 \
   docker-compose up
   ```

2. **Navigate to Admin Dashboard** → Translation Service → Monitoring tab

3. **Verify display:**
   - Port shows: `9000`
   - Max Cache Size shows: `5,000`
   - Cache TTL shows: `7 days`

4. **Test with different values:**
   - 86400 seconds → "1 day"
   - 3600 seconds → "1 hour"
   - 90000 seconds → "1 day, 1 hour"

## Related Files

- `/apps/translation-service/app.py` - Backend health endpoint
- `/apps/translation-service/Dockerfile` - Docker configuration
- `/docker-compose.translation.yml` - Docker Compose configuration
- `/apps/web/components/adminDashboard/sections/translation-service/useTranslationServiceViewModel.ts` - View model with formatters
- `/apps/web/components/adminDashboard/sections/translation-service/TranslationServiceView.tsx` - UI component

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSLATION_PORT` | 9000 | Service port |
| `TRANSLATION_CACHE_MAX_SIZE` | 1000 | Max cached items |
| `TRANSLATION_CACHE_EVICTION_TIME` | 259200 | Cache TTL in seconds (3 days) |
| `TRANSLATION_API_KEY` | (required) | API authentication key |
| `TRANSLATION_LOG_LEVEL` | INFO | Logging verbosity |

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0