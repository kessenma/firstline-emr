# Translation Service Quick Start Guide

This guide will help you deploy and troubleshoot the translation service for the Fajr Mission EMR system.

## 🚀 Quick Start

### 1. Update Environment Variables

Add these to your `.env` file in the project root:

```bash
# Translation Service Configuration
TRANSLATION_SERVICE_URL=http://translation-service:9000
TRANSLATION_PORT=9000
TRANSLATION_LOG_LEVEL=INFO
```

**⚠️ IMPORTANT**: The service runs on port **9000**, not 8000!

### 2. Deploy the Service

```bash
# From project root
docker-compose -f docker-compose.translation.yml up -d --build
```

### 3. Verify Deployment

```bash
# Check if service is running
docker ps | grep translation-service

# Check health endpoint
curl http://localhost:9000/health

# View logs
docker-compose -f docker-compose.translation.yml logs -f translation-service
```

You should see output like:
```
✅ Translation Service Started Successfully!
🌐 Listening on port 9000
📊 Health check available at /health
```

### 4. Test Translation

```bash
# Direct API test
curl -X POST http://localhost:9000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا", "targetLang": "English"}'
```

Expected response:
```json
{
  "translatedText": "Hello"
}
```

## 📊 Monitoring

### Check Service Status

```bash
# View real-time logs
docker-compose -f docker-compose.translation.yml logs -f translation-service

# Check health with details
curl -s http://localhost:9000/health | jq
```

### Understanding Log Output

**✅ Successful Request:**
```
📨 [abc123] Translation request received
📝 [abc123] Target language: English
📏 [abc123] Text length: 15 characters
🔄 [abc123] Calling translation service...
✅ [abc123] Translation successful
⏱️  [abc123] Total request time: 450ms
```

**💾 Cache Hit:**
```
✅ [def456] Cache hit! Age: 1234.5s
⏱️  [def456] Total request time: 8ms
```

**❌ Error:**
```
❌ [ghi789] Translation service error: 503 Service Unavailable
❌ [ghi789] No translation models could be loaded
```

## 🐛 Troubleshooting

### Issue 1: Service Not Responding

**Symptoms:**
- Web app shows "Translation failed"
- Logs show connection refused

**Solution:**
```bash
# 1. Check if service is running
docker ps | grep translation-service

# 2. If not running, start it
docker-compose -f docker-compose.translation.yml up -d

# 3. Check logs for errors
docker-compose -f docker-compose.translation.yml logs translation-service
```

### Issue 2: First Request Takes Too Long

**Symptoms:**
- First translation request times out
- Logs show model loading

**Solution:**
This is **normal**! The model downloads and loads on first request (30-90 seconds).

```bash
# Wait for model to load, then check health
sleep 60
curl http://localhost:9000/health
```

Once you see `"status": "healthy"`, translations will be fast (< 1 second).

### Issue 3: Wrong Port Configuration

**Symptoms:**
- 404 Not Found errors
- Connection refused to port 8000

**Solution:**
```bash
# Check your .env file
cat .env | grep TRANSLATION_SERVICE_URL

# Should be:
TRANSLATION_SERVICE_URL=http://translation-service:9000

# NOT:
# TRANSLATION_SERVICE_URL=http://translation-service:8000  ❌ WRONG!
```

### Issue 4: Web App Can't Connect

**Symptoms:**
```
❌ [abc123] Translation service call failed after 30000ms
⏰ Request timeout - translation service took too long to respond
```

**Diagnosis:**
```bash
# 1. Check if service is in same Docker network
docker network inspect coolify | grep translation-service

# 2. Test connection from web container
docker exec -it <web-container-name> sh
curl http://translation-service:9000/health
```

**Solution:**
- Ensure both services are on `coolify` network
- Restart web app to pick up new environment variables

### Issue 5: Memory Issues

**Symptoms:**
```
❌ Killed (OOM)
Container exits with code 137
```

**Solution:**
```bash
# Increase memory limit in docker-compose.translation.yml
# Edit the deploy.resources.limits.memory value to 4G or higher
docker-compose -f docker-compose.translation.yml up -d --build
```

## 🔍 Debug Mode

Enable detailed logging:

```bash
# Stop service
docker-compose -f docker-compose.translation.yml down

# Start with debug logging
LOG_LEVEL=DEBUG docker-compose -f docker-compose.translation.yml up
```

You'll see detailed logs like:
```
🔍 [abc123] Detected language: ar
🔍 [abc123] Arabic character detection: 15/15 chars (100%)
🤖 [abc123] Calling transformer model...
📤 [abc123] Original: مرحبا...
📥 [abc123] Translated: Hello...
```

## 📱 Testing from Web App

### 1. Enable Auto-Translate in Telegram Messages

1. Open a patient's Telegram messages
2. Click the **Settings** gear icon
3. Toggle **auto-translate** ON
4. Open browser console (F12)

### 2. Watch Console Logs

You should see:
```
🖱️  [TelegramHeader] Translate button clicked
🌐 Translation request received
📡 Calling translation service...
✅ Translation successful
```

### 3. Common Issues

**If you see:**
```
❌ Translation service error: Connection refused
```

**Then:**
1. Verify translation service is running (see Issue 1 above)
2. Check web app environment variables
3. Restart web app container

## 🔄 Restarting Services

```bash
# Restart translation service only
docker-compose -f docker-compose.translation.yml restart

# Full rebuild
docker-compose -f docker-compose.translation.yml down
docker-compose -f docker-compose.translation.yml up -d --build

# Restart web app to pick up changes
docker-compose -f docker-compose.yml restart web
```

## 📈 Performance Tips

1. **First Request**: Allow 30-90 seconds for model loading
2. **Cache Hits**: ~8ms response time
3. **Cache Misses**: ~200-500ms response time
4. **Batch Translations**: Process in parallel for better throughput

## 🎯 Testing Checklist

- [ ] Translation service health check passes: `curl http://localhost:9000/health`
- [ ] Direct translation test works (see Test Translation above)
- [ ] Web app can connect to service from Docker network
- [ ] Telegram messages show translate button
- [ ] Translation actually works in web UI
- [ ] Console logs show successful translations
- [ ] Cache is working (second translation is faster)

## 📚 Additional Resources

- Full documentation: `apps/translation-service/README.md`
- Environment variables: `apps/translation-service/.env.example`
- Docker compose config: `docker-compose.translation.yml`

## 🆘 Still Having Issues?

1. **Check all logs:**
   ```bash
   # Translation service
   docker-compose -f docker-compose.translation.yml logs translation-service
   
   # Web app
   docker-compose -f docker-compose.yml logs web
   ```

2. **Verify network connectivity:**
   ```bash
   docker network ls
   docker network inspect coolify
   ```

3. **Test each component:**
   - Health check: `curl http://localhost:9000/health`
   - Direct translation: See "Test Translation" above
   - Web API: Check browser console in web app

4. **Enable debug logging** (see Debug Mode above)

## 🎉 Success Indicators

When everything is working, you should see:

1. **In translation service logs:**
   ```
   ✅ Transformers pipeline loaded successfully!
   🎉 Translation Service Started Successfully!
   ```

2. **In web app console:**
   ```
   ✅ Translation request completed successfully
   ```

3. **In Telegram messages:**
   - Translate button appears
   - Clicking it translates Arabic messages to English
   - No error messages

Happy translating! 🌐✨