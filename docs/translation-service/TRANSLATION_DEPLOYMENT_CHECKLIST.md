# Translation Service Deployment Checklist

Use this checklist to ensure a smooth deployment of the translation service.

## Pre-Deployment Checks

### 1. Environment Configuration
- [ ] `.env` file exists in project root
- [ ] Add `TRANSLATION_SERVICE_URL=http://translation-service:9000` to `.env`
- [ ] Add `TRANSLATION_PORT=9000` to `.env`
- [ ] Add `TRANSLATION_LOG_LEVEL=INFO` to `.env` (or `DEBUG` for troubleshooting)
- [ ] Verify NO references to port 8000 for translation service
- [ ] Save and commit `.env` changes

### 2. Docker Environment
- [ ] Docker is running
- [ ] Docker Compose is installed
- [ ] `coolify` network exists: `docker network ls | grep coolify`
- [ ] Sufficient disk space for model downloads (~500MB)
- [ ] Sufficient memory available (recommend 2GB minimum, 4GB preferred)

### 3. File Verification
- [ ] `docker-compose.translation.yml` exists in project root
- [ ] `apps/translation-service/Dockerfile` is updated
- [ ] `apps/translation-service/app.py` has logging enhancements
- [ ] `apps/web/app/api/translate/route.ts` uses correct port (9000)
- [ ] Documentation files are present

## Deployment Steps

### Step 1: Stop Old Service (if applicable)
- [ ] Check if old service is running: `docker ps | grep translation`
- [ ] Stop old service: `docker-compose -f docker-compose.services.yml stop translation-service`
- [ ] Remove old container if needed: `docker rm translation-service`

### Step 2: Build and Start New Service
- [ ] Navigate to project root: `cd /path/to/fajr-medflow-emr`
- [ ] Build and start: `docker-compose -f docker-compose.translation.yml up -d --build`
- [ ] Wait 30 seconds for service to initialize
- [ ] Check container is running: `docker ps | grep translation-service`

### Step 3: Verify Service Health
- [ ] Check logs: `docker-compose -f docker-compose.translation.yml logs translation-service`
- [ ] Look for startup success message: "🎉 Translation Service Started Successfully!"
- [ ] Health check passes: `curl http://localhost:9000/health`
- [ ] Health response shows `"status": "healthy"` or `"loading"`

### Step 4: Test Translation Endpoint
- [ ] Run direct API test:
```bash
curl -X POST http://localhost:9000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا", "targetLang": "English"}'
```
- [ ] Verify response contains `"translatedText": "Hello"` (or similar)
- [ ] Check logs show successful translation
- [ ] Note: First request may take 30-90 seconds (model loading)

### Step 5: Update Web Application
- [ ] Restart web app to pick up new environment variables
- [ ] Command: `docker-compose restart web` (or your web container name)
- [ ] Wait for web app to fully restart
- [ ] Check web app logs for errors

### Step 6: Test from Web UI
- [ ] Open web application in browser
- [ ] Open browser console (F12 → Console tab)
- [ ] Navigate to patient Telegram messages
- [ ] Look for Settings gear icon
- [ ] Click Settings and find "translate thread" option
- [ ] Click "Translate" button
- [ ] Watch console for logs:
  - [ ] `🖱️ [TelegramHeader] Translate button clicked`
  - [ ] `📨 Translation request received`
  - [ ] `✅ Translation request completed successfully`

## Post-Deployment Verification

### Functional Tests
- [ ] Telegram messages load correctly
- [ ] Translate button appears in settings
- [ ] Clicking translate button triggers translation
- [ ] Arabic messages get translated to English
- [ ] Translations appear in UI
- [ ] No error messages in browser console
- [ ] No error messages in service logs

### Performance Tests
- [ ] First translation completes (may take 30-90s)
- [ ] Subsequent translations are faster (<1s)
- [ ] Cache is working (check logs for cache hits)
- [ ] Service responds to health checks promptly

### Logging Verification
- [ ] Translation service logs are detailed and readable
- [ ] Web API logs show request/response cycles
- [ ] Browser console shows translation flow
- [ ] Request IDs are present in logs for tracking
- [ ] Timing information is logged

## Troubleshooting During Deployment

### If Service Won't Start
- [ ] Check Docker logs: `docker-compose -f docker-compose.translation.yml logs`
- [ ] Verify port 9000 is not in use: `lsof -i :9000`
- [ ] Check Docker resources (CPU/memory)
- [ ] Try rebuilding: `docker-compose -f docker-compose.translation.yml up -d --build --force-recreate`

### If Health Check Fails
- [ ] Wait longer (model may still be loading)
- [ ] Check service logs for errors
- [ ] Verify port is exposed correctly
- [ ] Test with curl: `curl -v http://localhost:9000/health`

### If Web App Can't Connect
- [ ] Verify `TRANSLATION_SERVICE_URL` in web app environment
- [ ] Check both services are on same Docker network
- [ ] Test from web container: `docker exec -it <web-container> curl http://translation-service:9000/health`
- [ ] Restart web app after environment changes

### If Translations Fail
- [ ] Check translation service logs for errors
- [ ] Verify model loaded successfully
- [ ] Check web API route logs
- [ ] Enable DEBUG logging: `LOG_LEVEL=DEBUG`
- [ ] Test direct API call (see Step 4)

## Monitoring Checklist

### Daily Monitoring
- [ ] Check service is running: `docker ps | grep translation`
- [ ] Review logs for errors: `docker-compose -f docker-compose.translation.yml logs --tail=100`
- [ ] Verify health endpoint: `curl http://localhost:9000/health`

### Weekly Monitoring
- [ ] Check cache size (in health response)
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Review memory usage: `docker stats translation-service`

## Rollback Plan

If deployment fails:

1. [ ] Stop new service: `docker-compose -f docker-compose.translation.yml down`
2. [ ] Restart old service: `docker-compose -f docker-compose.services.yml up -d translation-service`
3. [ ] Revert `.env` changes if needed
4. [ ] Restart web app
5. [ ] Document issues encountered
6. [ ] Review logs for root cause

## Documentation References

- **Quick Start Guide**: `TRANSLATION_SERVICE_SETUP.md`
- **Full Documentation**: `apps/translation-service/README.md`
- **Changes Summary**: `TRANSLATION_SERVICE_CHANGES.md`
- **Environment Variables**: `apps/translation-service/.env.example`

## Sign-Off

Deployment completed by: ________________

Date: ________________

All checklist items completed: [ ] Yes  [ ] No

Issues encountered: ___________________________________________

___________________________________________________________

___________________________________________________________

Notes: ___________________________________________________

___________________________________________________________

___________________________________________________________

## Quick Commands Reference

```bash
# Start service
docker-compose -f docker-compose.translation.yml up -d --build

# View logs
docker-compose -f docker-compose.translation.yml logs -f translation-service

# Check health
curl http://localhost:9000/health

# Test translation
curl -X POST http://localhost:9000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا", "targetLang": "English"}'

# Stop service
docker-compose -f docker-compose.translation.yml down

# Restart service
docker-compose -f docker-compose.translation.yml restart

# Check resource usage
docker stats translation-service
```

---

**Success Criteria**: All items checked, service running, translations working, no errors in logs.