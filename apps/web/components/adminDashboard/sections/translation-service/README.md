# Translation Service Admin Section

This admin dashboard section provides monitoring and testing capabilities for the Arabic-English translation service.

## Features

### 📊 Overview Tab
- **Service Status**: Real-time health status (healthy/loading/error)
- **Uptime Monitor**: How long the service has been running
- **Cache Statistics**: Number of cached translations
- **Model Status**: Translation model loading state and details

### 🧪 Testing Tab
- **Manual Translation Testing**: Test Arabic→English translations
- **Quick Test Buttons**: Pre-filled test phrases for quick validation
- **Test History**: Last 10 translation tests with timing and results
- **Performance Metrics**: Response time for each translation

### 🔧 Details Tab
- **Service Configuration**: URL and connection details
- **Authentication Status**: API key configuration check
- **Advanced Diagnostics**: Raw health response JSON
- **Troubleshooting Guide**: Common issues and solutions

## Components

### `TranslationServiceView.tsx`
Main view component with tabs for different monitoring aspects.

**Features:**
- Real-time health monitoring
- Auto-refresh capability (30s intervals)
- Translation testing interface
- Service configuration display
- Troubleshooting information

### `useTranslationServiceViewModel.ts`
Custom hook managing state and API calls.

**Responsibilities:**
- Health check API calls
- Translation testing
- Test history management
- Auto-refresh logic
- Status formatting utilities

### API Route: `/api/translation/health`
Server-side API endpoint that proxies health checks to the translation service.

**Features:**
- API key authentication
- Request timeout (10s)
- Detailed error logging
- Response timing metrics

## Usage

### Accessing the Dashboard
1. Navigate to Admin Dashboard
2. Scroll to "Translation Service" section
3. Click to expand the section

### Running Health Checks
- Click "Check Health" button for manual check
- Enable "Auto-Refresh" for continuous monitoring (30s intervals)
- Status updates automatically on each check

### Testing Translations
1. Go to "Testing" tab
2. Enter Arabic text or use quick test buttons
3. Click "Test" to send translation request
4. View results and timing in test history

### Viewing Service Details
1. Go to "Details" tab
2. View service URL and configuration
3. Check authentication status
4. Expand "Advanced Information" for raw data

## Health Check Response

```typescript
interface HealthData {
  status: string;                    // "healthy" | "loading" | "error"
  models_loaded: {
    ctranslate2_loaded: boolean;
    transformers_loaded: boolean;
    any_model_loaded: boolean;
    model_name: string | null;
    load_time_seconds: number | null;
  };
  uptime_seconds: number;            // Service uptime
  cache_size: number;                // Number of cached translations
  timestamp: string;                 // ISO timestamp
  duration?: number;                 // Response time in ms
}
```

## Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| `healthy` | 🟢 Green | Service is operational and models loaded |
| `loading` | 🟡 Yellow | Service starting or models loading |
| `error` | 🔴 Red | Service unavailable or error occurred |
| `timeout` | 🔴 Red | Health check took too long to respond |

## Troubleshooting

### Service Not Responding
**Symptoms:**
- "Service Unavailable" error
- Timeout errors
- No health data

**Solutions:**
1. Check translation service container is running:
   ```bash
   docker ps | grep translation-service
   ```
2. Verify environment variables:
   ```bash
   TRANSLATION_SERVICE_URL=http://translation-service:9000
   TRANSLATION_API_KEY=your-api-key-here
   ```
3. Check Docker network connectivity
4. Review service logs:
   ```bash
   docker-compose -f docker-compose.translation.yml logs -f
   ```

### Authentication Errors (401/403)
**Symptoms:**
- "Invalid API key" or "Missing API key" errors

**Solutions:**
1. Verify `TRANSLATION_API_KEY` is set in both:
   - Web app environment
   - Translation service environment
2. Ensure keys match exactly
3. Restart both services after env changes

### Model Not Loaded
**Symptoms:**
- Status shows "loading"
- `any_model_loaded` is false

**Solutions:**
1. Wait 30-90 seconds (first-time model download)
2. Check service has sufficient memory (2-4GB)
3. Verify internet connection for model download
4. Review service logs for errors

### Translation Tests Failing
**Symptoms:**
- Test results show errors
- Slow response times (>2s)

**Solutions:**
1. Verify service health is "healthy"
2. Check model is loaded
3. Ensure text is valid Arabic
4. Check service logs for errors

## Performance Expectations

| Metric | Expected Value |
|--------|---------------|
| Health Check | < 500ms |
| First Translation (cold) | 30-90s (model load) |
| Cached Translation | < 50ms |
| New Translation | 200-500ms |
| Service Startup | 10-30s |

## Development

### Adding New Metrics
1. Update health response type in `useTranslationServiceViewModel.ts`
2. Add metric card to Overview tab
3. Update health check API to include new data

### Adding New Tests
1. Add test function to view model
2. Create UI in Testing tab
3. Update test history display

### Customizing Display
- Modify card layouts in `TranslationServiceView.tsx`
- Update status colors in view model utilities
- Customize tabs order or add new tabs

## Environment Variables

### Web App
```bash
TRANSLATION_SERVICE_URL=http://translation-service:9000
TRANSLATION_API_KEY=your-secure-api-key
```

### Translation Service
```bash
TRANSLATION_API_KEY=your-secure-api-key  # Must match web app
TRANSLATION_PORT=9000
LOG_LEVEL=INFO
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/translation/health` | GET | Health check proxy |
| `/api/translate` | POST | Translation testing |

## Related Documentation

- Translation Service: `apps/translation-service/README.md`
- Local Development: `apps/translation-service/LOCAL_DEVELOPMENT.md`
- Deployment Guide: your deployment platform’s docs
- Environment Variables: `TRANSLATION_ENV_VARS.md`

## Future Enhancements

- [ ] Historical metrics charts
- [ ] Translation performance graphs
- [ ] Cache hit/miss ratio tracking
- [ ] Alert system for service issues
- [ ] Export test results
- [ ] Batch translation testing
- [ ] Service restart capability
- [ ] Log viewer integration