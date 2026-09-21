# Translation Service - Local Development Guide

This guide shows you how to run and test the translation service locally on your machine.

## 🚀 Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in `apps/translation-service/` directory:

```bash
# apps/translation-service/.env

# Security - API Key (optional for local dev, required for production)
TRANSLATION_API_KEY=dev-local-key-12345

# Port configuration
TRANSLATION_PORT=9000

# Logging level (use DEBUG for development)
LOG_LEVEL=DEBUG

# Python configuration
PYTHONUNBUFFERED=1
NODE_ENV=development
```

**Note:** For local development, you can use any API key. Just remember to use the same key when testing from your web app!

### 2. Install Dependencies

```bash
cd apps/translation-service

# Using uv (recommended - fast!)
uv sync

# Or using pip
pip install -r requirements.txt
```

### 3. Run the Service

```bash
# Using uv (recommended)
uv run python app.py

# Or directly with python
python app.py
```

You should see:
```
🚀 Translation Service Starting...
📊 Log Level: DEBUG
🔒 API Key Authentication: Enabled
🌐 Port: 9000
✅ Transformers pipeline loaded successfully!
🎉 Translation Service Started Successfully!
```

### 4. Test the Service

Open a new terminal and test:

```bash
# Health check
curl -H "X-API-Key: dev-local-key-12345" http://localhost:9000/health

# Test translation
curl -X POST http://localhost:9000/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-local-key-12345" \
  -d '{"text": "مرحبا", "targetLang": "English"}'
```

Expected response:
```json
{"translatedText":"Hello"}
```

## 🧪 Testing with Your Web App Locally

If you want to test the translation service with your local web app:

### Option 1: Run Both Locally (Without Docker)

1. **Start translation service** (port 9000):
   ```bash
   cd apps/translation-service
   uv run python app.py
   ```

2. **Update web app `.env`**:
   ```bash
   # In your web app's .env or .env.local
   TRANSLATION_SERVICE_URL=http://localhost:9000
   TRANSLATION_API_KEY=dev-local-key-12345
   ```

3. **Start web app** (port 3000):
   ```bash
   cd apps/web
   bun run dev
   ```

4. **Test**: Navigate to Telegram messages and try translating!

### Option 2: Run Translation Service Locally, Web App in Docker

1. **Start translation service locally**:
   ```bash
   cd apps/translation-service
   uv run python app.py
   ```

2. **Update docker-compose for web app**:
   ```yaml
   # Point to your host machine
   TRANSLATION_SERVICE_URL=http://host.docker.internal:9000
   TRANSLATION_API_KEY=dev-local-key-12345
   ```

3. **Start web app in Docker**:
   ```bash
   docker-compose -f docker-compose.web.yml up
   ```

## 🐛 Development Without API Key (Not Recommended)

If you want to develop without API key authentication (easier for quick testing):

1. **Don't set `TRANSLATION_API_KEY`** in your `.env` file:
   ```bash
   # apps/translation-service/.env
   
   # TRANSLATION_API_KEY=  # Comment out or remove
   TRANSLATION_PORT=9000
   LOG_LEVEL=DEBUG
   ```

2. **Run the service**:
   ```bash
   uv run python app.py
   ```
   
   You'll see a warning:
   ```
   ⚠️  WARNING: No TRANSLATION_API_KEY set! Service is running without authentication!
   ```

3. **Test without API key**:
   ```bash
   # No X-API-Key header needed
   curl -X POST http://localhost:9000/translate \
     -H "Content-Type: application/json" \
     -d '{"text": "مرحبا", "targetLang": "English"}'
   ```

**Warning:** This is only for local development! Always use API keys in production.

## 📊 Development Tips

### Enable Debug Logging

Set `LOG_LEVEL=DEBUG` in your `.env` to see detailed logs:

```bash
LOG_LEVEL=DEBUG
```

You'll see:
```
🔍 [abc123] Detected language: ar
🔍 [abc123] Arabic character detection: 15/15 chars (100%)
🤖 [abc123] Calling transformer model...
📤 [abc123] Original: مرحبا...
📥 [abc123] Translated: Hello...
```

### Hot Reload (Auto-restart on Changes)

Use `uvicorn` directly for hot reload:

```bash
# Install uvicorn if not already
uv pip install uvicorn

# Run with reload
uvicorn app:app --host 0.0.0.0 --port 9000 --reload
```

Now the service will automatically restart when you modify `app.py`!

### Test Different Ports

```bash
# In .env
TRANSLATION_PORT=9001

# Run
uv run python app.py

# Test on new port
curl -H "X-API-Key: dev-local-key-12345" http://localhost:9001/health
```

### View Cache Size

The health endpoint shows cache metrics:

```bash
curl -s -H "X-API-Key: dev-local-key-12345" http://localhost:9000/health | jq '.cache_size'
```

## 🔍 Troubleshooting

### Issue: Port Already in Use

```
Error: Address already in use
```

**Solution:**
```bash
# Find what's using port 9000
lsof -i :9000

# Kill it or use a different port
TRANSLATION_PORT=9001 uv run python app.py
```

### Issue: Model Loading Takes Forever

**First run** downloads the model (~500MB). This can take 5-10 minutes depending on your internet.

**Solution:** Be patient! Subsequent runs will be instant as the model is cached.

### Issue: Out of Memory

Translation models need ~1-2GB RAM.

**Solution:**
- Close other applications
- Restart your machine
- Consider using a smaller model (modify `app.py`)

### Issue: Dependencies Not Installing

```bash
# Clear cache and reinstall
rm -rf .venv
uv sync --reinstall
```

## 📝 File Structure

```
apps/translation-service/
├── .env                    # Your local environment variables
├── .env.example           # Template (don't modify)
├── app.py                 # Main application code
├── pyproject.toml         # Python dependencies
├── requirements.txt       # Alternative dependencies
├── uv.lock               # Locked dependencies
├── Dockerfile            # For Docker deployment
└── LOCAL_DEVELOPMENT.md  # This file
```

## 🎯 Common Development Workflows

### Workflow 1: Quick Test
```bash
# Terminal 1
cd apps/translation-service
uv run python app.py

# Terminal 2
curl -X POST http://localhost:9000/translate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-local-key-12345" \
  -d '{"text": "مرحبا", "targetLang": "English"}'
```

### Workflow 2: Development with Web App
```bash
# Terminal 1: Translation service
cd apps/translation-service
LOG_LEVEL=DEBUG uv run python app.py

# Terminal 2: Web app
cd apps/web
bun run dev

# Browser: http://localhost:3000
# Test translations in Telegram messages
```

### Workflow 3: Testing API Key Authentication
```bash
# Start service with API key
TRANSLATION_API_KEY=my-test-key uv run python app.py

# Test with correct key (should work)
curl -H "X-API-Key: my-test-key" http://localhost:9000/health

# Test with wrong key (should fail)
curl -H "X-API-Key: wrong-key" http://localhost:9000/health

# Test without key (should fail)
curl http://localhost:9000/health
```

## 🚀 Moving to Production

When you're ready to deploy:

1. Generate a secure API key:
   ```bash
   openssl rand -hex 32
   ```

2. Add to server's `.env`:
   ```bash
   TRANSLATION_API_KEY=<your-secure-key>
   TRANSLATION_PORT=9000
   LOG_LEVEL=INFO
   ```

3. Deploy:
   ```bash
   docker-compose -f docker-compose.translation.yml up -d --build
   ```

See your deployment platform’s docs for full deployment instructions.

## 📚 Additional Resources

- Full Documentation: `README.md`
- Environment Variables: `.env.example`
- Deployment Guide: your deployment platform’s docs
- Quick Reference: `../../../TRANSLATION_QUICK_REFERENCE.txt`

## 💡 Pro Tips

- **Use DEBUG logs** during development to see what's happening
- **First request is slow** (model loading) - be patient!
- **Cache works great** - second translation of same text is instant
- **API key is optional** for local dev but required for production
- **Port 9000** is default but you can change it if needed

Happy developing! 🎉