# Translation Service

A FastAPI-based Arabic-English translation service using the Helsinki-NLP/opus-mt-ar-en model from HuggingFace Transformers.

## Features

- **Arabic to English Translation**: Specialized model for Arabic→English translation
- **Caching**: In-memory caching with automatic eviction (3-day TTL)
- **Language Detection**: Automatic detection with fallback for Arabic text
- **Health Checks**: Comprehensive health endpoint with service metrics
- **Comprehensive Logging**: Detailed request/response tracking for debugging

## Architecture

```
Web App (Next.js)
    ↓
/api/translate (Next.js API Route)
    ↓ HTTP POST
Translation Service (FastAPI, Port 9000)
    ↓
Helsinki-NLP/opus-mt-ar-en Model
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSLATION_SERVICE_URL` | `http://translation-service:9000` | Internal Docker network URL (web app) |
| `TRANSLATION_PORT` | `9000` | External port mapping |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `NODE_ENV` | `production` | Environment mode |

## Docker Deployment

### Build and Run with Docker Compose

```bash
# From project root
docker-compose -f docker-compose.translation.yml up -d --build

# View logs
docker-compose -f docker-compose.translation.yml logs -f translation-service

# Stop service
docker-compose -f docker-compose.translation.yml down
```

### Standalone Docker Build

```bash
# Build
docker build -t translation-service ./apps/translation-service

# Run
docker run -d \
  -p 9000:9000 \
  --name translation-service \
  -e LOG_LEVEL=DEBUG \
  translation-service
```

## API Endpoints

### POST /translate

Translate text from Arabic to English.

**Request:**
```json
{
  "text": "مرحبا بك",
  "targetLang": "English"
}
```

**Response:**
```json
{
  "translatedText": "Welcome"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request (empty text, invalid language)
- `500`: Translation error
- `503`: Service unavailable (model not loaded)

### GET /health

Service health check with detailed metrics.

**Response:**
```json
{
  "status": "healthy",
  "models_loaded": {
    "ctranslate2_loaded": false,
    "transformers_loaded": true,
    "any_model_loaded": true,
    "model_name": "Helsinki-NLP/opus-mt-ar-en",
    "load_time_seconds": 45.23
  },
  "uptime_seconds": 1234.56,
  "cache_size": 42,
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused / Service Unavailable

**Symptoms:**
```
❌ Translation service call failed: fetch failed
❌ Connection refused
```

**Diagnosis:**
```bash
# Check if service is running
docker ps | grep translation-service

# Check service logs
docker logs translation-service

# Check health endpoint
curl http://localhost:9000/health
```

**Solutions:**
- Ensure service is running: `docker-compose -f docker-compose.translation.yml up -d`
- Verify port 9000 is not in use: `lsof -i :9000`
- Check Docker network connectivity: `docker network inspect coolify`

#### 2. Wrong Port Configuration

**Symptoms:**
```
❌ Translation service error: 404 Not Found
```

**Solution:**
- Ensure `TRANSLATION_SERVICE_URL` uses port **9000**, not 8000
- Check `.env` file:
  ```bash
  TRANSLATION_SERVICE_URL=http://translation-service:9000
  ```

#### 3. Model Loading Timeout

**Symptoms:**
```
⏰ Request timeout - translation service took too long to respond
```

**Solution:**
- Models load on first request (takes 30-90 seconds)
- Wait for health check to show `"status": "healthy"`
- Increase startup timeout in docker-compose:
  ```yaml
  healthcheck:
    start_period: 90s
  ```

#### 4. Memory Issues

**Symptoms:**
```
❌ Killed (OOM)
```

**Solution:**
- Increase memory limits in docker-compose.yml:
  ```yaml
  deploy:
    resources:
      limits:
        memory: 4G
  ```
- Consider using CTranslate2 for smaller memory footprint

### Enable Debug Logging

```bash
# In .env file
TRANSLATION_LOG_LEVEL=DEBUG

# Or via docker-compose
docker-compose -f docker-compose.translation.yml up -d \
  -e LOG_LEVEL=DEBUG
```

### Test Translation Service Directly

```bash
# Health check
curl http://localhost:9000/health

# Test translation
curl -X POST http://localhost:9000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا", "targetLang": "English"}'
```

### Check Web App Connection

```bash
# From within web container
docker exec -it <web-container-id> sh
curl http://translation-service:9000/health
```

## Performance

### Model Loading
- **First Request**: 30-90 seconds (model download + load)
- **Subsequent Requests**: < 1 second (model cached in memory)

### Translation Speed
- **Typical**: 100-500ms per message
- **Factors**: Text length, CPU performance, cache hits

### Caching
- **Cache Hit**: < 10ms
- **Eviction**: Every 1 hour (removes entries > 3 days old)
- **Storage**: In-memory (lost on restart)

## Monitoring

### Key Metrics to Watch

```bash
# Request logs with timing
📨 [abc123] Translation request received
⏱️  [abc123] Translation service responded in 450ms
✅ [abc123] Translation request completed successfully

# Cache performance
✅ [def456] Cache hit! Age: 1234.5s
💾 [ghi789] Translation cached (cache size: 42)

# Model status
✅ Transformers pipeline loaded successfully!
⏱️  Load time: 45.23 seconds
```

### Health Monitoring

```bash
# Continuous health check
watch -n 5 'curl -s http://localhost:9000/health | jq'

# Check uptime and cache size
curl -s http://localhost:9000/health | jq '.uptime_seconds, .cache_size'
```

## Development

### Local Development (without Docker)

```bash
cd apps/translation-service

# Install dependencies with uv
uv sync

# Run service
uv run python app.py

# Or with uvicorn directly
uv run uvicorn app:app --host 0.0.0.0 --port 9000 --reload
```

### Testing

```bash
# Install dev dependencies
uv sync --all-extras

# Run tests (if available)
uv run pytest
```

## Migration from docker-compose.services.yml

If migrating from the old `docker-compose.services.yml`:

1. **Stop old service:**
   ```bash
   docker-compose -f docker-compose.services.yml down
   ```

2. **Update environment variables:**
   ```bash
   # In .env
   TRANSLATION_SERVICE_URL=http://translation-service:9000
   TRANSLATION_PORT=9000
   ```

3. **Start new service:**
   ```bash
   docker-compose -f docker-compose.translation.yml up -d --build
   ```

4. **Verify:**
   ```bash
   curl http://localhost:9000/health
   docker-compose -f docker-compose.translation.yml logs -f
   ```

## Production Considerations

1. **Resource Limits**: Set appropriate CPU/memory limits
2. **Persistent Cache**: Consider Redis for distributed caching
3. **Model Optimization**: Use CTranslate2 for better performance
4. **Load Balancing**: Run multiple instances behind a load balancer
5. **Monitoring**: Integrate with Prometheus/Grafana for metrics
6. **Security**: Use API keys or JWT for authentication
7. **Rate Limiting**: Implement rate limiting to prevent abuse

## License

This service uses the Helsinki-NLP/opus-mt-ar-en model, which is licensed under Apache 2.0.