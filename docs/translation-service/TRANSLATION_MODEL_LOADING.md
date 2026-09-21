# Translation Service - Model Loading & Caching Strategy

This document explains when and how translation models are downloaded, loaded, and cached.

## 🕐 Timeline: When Models Are Downloaded

### Previous Behavior (On-Demand Loading)

```
1. Docker Build Phase (Coolify)
   ├─ Install Python 3.13 ✅
   ├─ Install dependencies (transformers, fastapi, etc.) ✅
   ├─ Copy application code ✅
   └─ Download models? ❌ NO

2. Container Starts
   ├─ FastAPI app initializes ✅
   ├─ Server listens on port 9000 ✅
   └─ Download models? ❌ NO

3. First /translate or /health Request
   ├─ load_translation_models() called ✅
   ├─ HuggingFace downloads ~600MB ⏳ (2-5 minutes!)
   ├─ Models cached locally ✅
   └─ Translation processed ✅
```

**Problems:**
- ❌ First request takes 2-5 minutes
- ❌ Health checks might timeout
- ❌ Poor user experience
- ❌ Without volume mount, models re-download on every restart

### New Behavior (Pre-Loading on Startup)

```
1. Docker Build Phase (Coolify)
   ├─ Install Python 3.13 ✅
   ├─ Install dependencies ✅
   ├─ Copy application code ✅
   └─ Download models? ❌ NO (Docker images should be stateless)

2. Container Starts
   ├─ FastAPI app initializes ✅
   ├─ Lifespan startup event triggers ✅
   ├─ load_translation_models() called automatically ✅
   │
   ├─ First Time (no cache):
   │  ├─ Download ar-en model (~300MB) ⏳ 1-2 min
   │  ├─ Download en-ar model (~300MB) ⏳ 1-2 min
   │  └─ Cache to /root/.cache/huggingface/ ✅
   │
   └─ Subsequent Times (with cache):
      ├─ Load from volume instantly ⚡ ~10 seconds
      └─ No network download needed ✅

3. Server Ready
   ├─ Health check returns healthy ✅
   ├─ First translation is instant ⚡
   └─ All requests are fast ✅
```

**Benefits:**
- ✅ Service is ready immediately after startup
- ✅ First request is fast
- ✅ Health checks succeed
- ✅ Better monitoring of download progress
- ✅ Models persist across restarts

## 📦 Model Information

### Models Used

| Direction | Model | Size | Source |
|-----------|-------|------|--------|
| Arabic → English | `Helsinki-NLP/opus-mt-ar-en` | ~300 MB | HuggingFace |
| English → Arabic | `Helsinki-NLP/opus-mt-en-ar` | ~300 MB | HuggingFace |
| **Total** | | **~600 MB** | |

### Cache Location

**Inside Container:** `/root/.cache/huggingface/hub/`

**Volume Mount:** `translation-models:/root/.cache/huggingface`

**On Host:** Docker manages this as a named volume

## 🗄️ Volume Persistence Strategy

### Docker Compose Configuration

```yaml
services:
  translation-service:
    volumes:
      # Persist models across container restarts
      - translation-models:/root/.cache/huggingface

volumes:
  translation-models:
    driver: local
```

### What This Does

1. **First Deployment:**
   - Container starts
   - Models download from HuggingFace (~5 minutes)
   - Models saved to Docker volume
   - Service becomes ready

2. **Container Restart:**
   - Container starts
   - Models load from volume (~10 seconds)
   - Service becomes ready quickly

3. **Container Rebuild:**
   - New container created
   - Volume still exists with cached models
   - Models load from volume (~10 seconds)
   - No re-download needed

4. **Volume Deleted (intentional or cleanup):**
   - Models re-download on next startup (~5 minutes)

### Benefits of Volume Persistence

- ✅ **Fast restarts**: Models load in seconds, not minutes
- ✅ **Reduced bandwidth**: No repeated downloads
- ✅ **Reliability**: Not dependent on HuggingFace availability
- ✅ **Cost savings**: Less data transfer

## 🚀 Startup Sequence

### Code Flow

```python
# 1. Service initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    # Startup
    logger.info("🎉 Translation Service Started Successfully!")
    
    # 2. Pre-load models
    logger.info("🚀 Pre-loading translation models...")
    try:
        load_translation_models()  # Downloads if not cached
        logger.info("✅ Models pre-loaded successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to pre-load models: {e}")
        # Service continues, will retry on first translation
    
    yield
    
    # Shutdown
    logger.info("👋 Translation Service Shutting Down...")
```

### Log Output (First Startup)

```
2025-01-15 10:00:00 - 🚀 Translation Service Starting...
2025-01-15 10:00:01 - 🎉 Translation Service Started Successfully!
2025-01-15 10:00:01 - 🚀 Pre-loading translation models...
2025-01-15 10:00:01 - 📦 Loading translation models on demand...
2025-01-15 10:00:01 - 📥 Loading Arabic→English model...
2025-01-15 10:00:01 - ⏳ This may take a minute on first run...
Downloading (…)lve/main/config.json: 100%|██████████| 1.46k/1.46k
Downloading pytorch_model.bin: 100%|██████████| 312M/312M [01:23<00:00, 3.74MB/s]
2025-01-15 10:01:25 - ✅ Arabic→English model loaded successfully!
2025-01-15 10:01:25 - 📥 Loading English→Arabic model...
Downloading (…)lve/main/config.json: 100%|██████████| 1.46k/1.46k
Downloading pytorch_model.bin: 100%|██████████| 308M/308M [01:20<00:00, 3.85MB/s]
2025-01-15 10:02:45 - ✅ English→Arabic model loaded successfully!
2025-01-15 10:02:45 - ✅ Models pre-loaded successfully!
2025-01-15 10:02:45 - Uvicorn running on http://0.0.0.0:9000
```

### Log Output (Subsequent Startups)

```
2025-01-15 11:00:00 - 🚀 Translation Service Starting...
2025-01-15 11:00:01 - 🎉 Translation Service Started Successfully!
2025-01-15 11:00:01 - 🚀 Pre-loading translation models...
2025-01-15 11:00:01 - 📦 Loading translation models on demand...
2025-01-15 11:00:01 - 📥 Loading Arabic→English model...
2025-01-15 11:00:03 - ✅ Arabic→English model loaded successfully!
2025-01-15 11:00:03 - 📥 Loading English→Arabic model...
2025-01-15 11:00:05 - ✅ English→Arabic model loaded successfully!
2025-01-15 11:00:05 - ✅ Models pre-loaded successfully!
2025-01-15 11:00:05 - Uvicorn running on http://0.0.0.0:9000
```

**Notice:** 5 seconds vs 2+ minutes!

## ⏱️ Timing Expectations

| Scenario | First Time | With Cache |
|----------|------------|------------|
| **Container Start** | ~5 minutes | ~10 seconds |
| **Model Loading** | 2-5 minutes (network dependent) | 5-10 seconds |
| **Service Ready** | ~5 minutes | ~15 seconds |
| **First Translation** | Instant (already loaded) | Instant |

## 🏥 Health Check Configuration

### Docker Compose Settings

```yaml
healthcheck:
  test:
    - CMD
    - sh
    - -c
    - 'curl -f -H "X-API-Key: $${TRANSLATION_API_KEY}" http://localhost:9000/health || exit 1'
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 300s  # 5 minutes - allows for model downloads
```

### Why 5 Minutes?

- **First startup**: Models download (~2-5 min) + load (~30 sec)
- **Buffer**: Network variability, slow connections
- **Safety**: Prevents premature health check failures

### Subsequent Startups

- Models load from cache in ~10 seconds
- Health check succeeds on first attempt
- Service marked healthy quickly

## 🔧 Coolify Deployment

### First Deployment

```
[Coolify] Building Docker image... ✅
[Coolify] Starting container... ✅
[Container] FastAPI starting... ✅
[Container] Downloading ar-en model... ⏳ (2 min)
[Container] Downloading en-ar model... ⏳ (2 min)
[Container] Models loaded! ✅
[Coolify] Health check passed ✅
[Coolify] Service is LIVE 🎉
```

**Total Time:** ~5-7 minutes

### Redeployment (code changes)

```
[Coolify] Building new Docker image... ✅
[Coolify] Starting new container... ✅
[Container] FastAPI starting... ✅
[Container] Loading models from cache... ⚡ (10 sec)
[Container] Models loaded! ✅
[Coolify] Health check passed ✅
[Coolify] Service is LIVE 🎉
```

**Total Time:** ~2-3 minutes

## 📊 Monitoring Download Progress

### Admin Dashboard

Navigate to: **Admin → Translation Service → Monitoring**

You'll see the "Model Download Progress" card showing:

```
┌─────────────────────────────────────────────────────┐
│ Model Download Progress                             │
├─────────────────────────────────────────────────────┤
│ Arabic → English Model          🔄 downloading      │
│ ████████████████████░░░░░░░░░░░░ 65%                │
│                                 195.50 MB / 300 MB  │
│                                                     │
│ English → Arabic Model          ⏰ pending          │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%                │
│                                 0.00 MB / 300 MB    │
└─────────────────────────────────────────────────────┘
```

**Tip:** Enable "Auto-refresh" to see live updates every 30 seconds.

## 🐛 Troubleshooting

### Models Download Every Time

**Symptom:** Long startup time on every restart

**Cause:** Volume not persisted

**Solution:**
```bash
# Check if volume exists
docker volume ls | grep translation-models

# If missing, redeploy with volume configuration
# Make sure docker-compose.yml has the volumes section
```

### First Startup Takes Too Long

**Symptom:** Container keeps restarting, health checks fail

**Cause:** Health check `start_period` too short

**Solution:** Increase to 300s (5 minutes) as shown above

### Download Fails Mid-Way

**Symptom:** Error during model loading, service unavailable

**Cause:** Network interruption, HuggingFace API issues

**Solution:**
1. Check network connectivity
2. Verify HuggingFace status: https://status.huggingface.co/
3. Restart container to retry download
4. Check logs: `docker-compose logs -f translation-service`

### Models Not Loading from Cache

**Symptom:** Always downloads, even with volume

**Cause:** Volume mount path mismatch

**Solution:**
```bash
# Verify cache location inside container
docker exec -it <container-id> ls -la /root/.cache/huggingface/

# Should see: models--Helsinki-NLP--opus-mt-ar-en
#             models--Helsinki-NLP--opus-mt-en-ar
```

### Disk Space Issues

**Symptom:** Download fails with disk space error

**Cause:** Not enough space for 600MB+ models

**Solution:**
```bash
# Check disk space
df -h

# Clean up old Docker resources
docker system prune -a --volumes

# Ensure at least 2GB free space
```

## 🔐 Security Considerations

### Cache Permissions

Models are cached in `/root/.cache/` which is only accessible by root user inside the container. This is secure because:

- ✅ Non-privileged processes can't modify cached models
- ✅ Models verified by HuggingFace checksums
- ✅ No external access to cache directory

### Volume Security

- Volume is local to the Docker host
- Not exposed to network
- Managed by Docker daemon with appropriate permissions

## 📈 Performance Impact

### Memory Usage

| State | RAM Usage |
|-------|-----------|
| Service running (no models) | ~100 MB |
| Both models loaded | ~1.5 GB |
| During translation | ~1.8 GB (peak) |

**Recommendation:** Allocate at least 2GB RAM to the container

### Disk Usage

| Component | Size |
|-----------|------|
| Docker image | ~500 MB |
| Model cache (ar-en) | ~300 MB |
| Model cache (en-ar) | ~300 MB |
| **Total** | **~1.1 GB** |

**Recommendation:** Allocate at least 5GB disk space

### Network Usage

| Scenario | Download Size |
|----------|---------------|
| First deployment | ~600 MB |
| With cache | 0 MB (no download) |
| Model updates | ~600 MB (rare) |

## 🚀 Optimization Tips

### 1. Pre-warm Cache Before Production

```bash
# Start service locally first
docker-compose up

# Wait for models to download (~5 min)

# Then deploy to production with volume
# Models will load instantly from cache
```

### 2. Use Faster Network for First Deploy

Download models over fast connection, then deploy to production server with cache already populated.

### 3. Monitor Download Progress

Enable auto-refresh in admin dashboard during first deployment to track progress.

### 4. Backup Volume (Optional)

```bash
# Create backup of model cache
docker run --rm -v translation-models:/data -v $(pwd):/backup \
  alpine tar czf /backup/translation-models-backup.tar.gz /data

# Restore on new server
docker run --rm -v translation-models:/data -v $(pwd):/backup \
  alpine tar xzf /backup/translation-models-backup.tar.gz -C /
```

## 📚 Related Documentation

- [TRANSLATION_SERVICE_V2_FEATURES.md](./TRANSLATION_SERVICE_V2_FEATURES.md) - Feature overview
- [TRANSLATION_DOWNLOAD_PROGRESS.md](./TRANSLATION_DOWNLOAD_PROGRESS.md) - Progress tracking details
- [TRANSLATION_CONFIG_DISPLAY.md](./TRANSLATION_CONFIG_DISPLAY.md) - Configuration display
- [apps/translation-service/README.md](./apps/translation-service/README.md) - Full service docs

---

**Last Updated:** 2025-01-15  
**Version:** 2.0.0  
**Status:** ✅ Implemented - Pre-loading on Startup