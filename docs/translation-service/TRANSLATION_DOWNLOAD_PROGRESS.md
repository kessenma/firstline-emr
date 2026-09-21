# Translation Service - Model Download Progress Tracking

This document describes the model download progress tracking feature for the Translation Service admin dashboard.

## Overview

The translation service now tracks and displays the download progress of HuggingFace translation models in real-time. This helps administrators monitor the initial setup process and troubleshoot any download issues.

## Features

### 1. Real-Time Progress Tracking
- **Status Monitoring**: Track download status (pending, downloading, completed, error)
- **Progress Percentage**: Visual progress bar showing download completion
- **File Size Tracking**: Display downloaded MB/GB and total size
- **Error Reporting**: Show detailed error messages if downloads fail

### 2. Per-Model Tracking
Each translation model is tracked independently:
- **Arabic → English** (`Helsinki-NLP/opus-mt-ar-en`)
- **English → Arabic** (`Helsinki-NLP/opus-mt-en-ar`)

### 3. Visual Indicators
- ✅ **Green checkmark**: Model downloaded and loaded successfully
- 🔄 **Spinning loader**: Model currently downloading
- ⚠️ **Red X**: Download or loading error
- ⏰ **Clock**: Waiting to download (pending)

## Download States

| State | Description | UI Display |
|-------|-------------|------------|
| `pending` | Model not yet started downloading | Gray badge, clock icon |
| `downloading` | Model currently downloading | Blue badge, animated spinner, progress bar |
| `completed` | Model fully downloaded and loaded | Green badge, checkmark, full progress bar |
| `error` | Download or loading failed | Red badge, X icon, error message |

## API Response Structure

### Health Endpoint (`/health`)

```json
{
  "status": "healthy",
  "models_loaded": { ... },
  "uptime_seconds": 12345.67,
  "cache_size": 42,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "config": { ... },
  "download_progress": {
    "ar_en": {
      "status": "completed",
      "progress_percent": 100,
      "downloaded_mb": 298.45,
      "total_mb": 298.45,
      "error": null
    },
    "en_ar": {
      "status": "downloading",
      "progress_percent": 65,
      "downloaded_mb": 195.50,
      "total_mb": 301.20,
      "error": null
    }
  }
}
```

## UI Components

### Model Download Progress Card

Located in the "Monitoring" tab of the Translation Service admin section:

```
┌─────────────────────────────────────────────────────────────────┐
│ Model Download Progress                                         │
│ Translation model download and loading status                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Arabic → English Model                    ✅ completed           │
│ ████████████████████████████████████████ 100%                   │
│                                          298.45 MB / 298.45 MB  │
│                                                                 │
│ English → Arabic Model                    🔄 downloading        │
│ █████████████████████░░░░░░░░░░░░░░░░░░░ 65%                   │
│                                          195.50 MB / 301.20 MB  │
│                                                                 │
│ ℹ️ Models are being downloaded from HuggingFace. This happens   │
│   on first startup and may take a few minutes depending on      │
│   your connection speed.                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Features:
- **Status badges** with color coding (green/blue/red/gray)
- **Progress bars** showing visual download progress
- **File size display** in MB or GB format
- **Icons** indicating current state
- **Info banner** explaining download process
- **Error messages** displayed inline if download fails

## Code Implementation

### Backend (Python)

**Progress Tracking Structure:**
```python
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
```

**Update Function:**
```python
def update_download_progress(
    model_key, status, progress=0, downloaded_mb=0, total_mb=0, error=None
):
    """Update the download progress for a specific model."""
    MODEL_DOWNLOAD_PROGRESS[model_key]["status"] = status
    MODEL_DOWNLOAD_PROGRESS[model_key]["progress_percent"] = progress
    MODEL_DOWNLOAD_PROGRESS[model_key]["downloaded_mb"] = round(downloaded_mb, 2)
    MODEL_DOWNLOAD_PROGRESS[model_key]["total_mb"] = round(total_mb, 2)
    MODEL_DOWNLOAD_PROGRESS[model_key]["error"] = error
```

**Model Loading with Progress Updates:**
```python
# Start download
update_download_progress("ar_en", "downloading", progress=0, downloaded_mb=0, total_mb=300)

# Load model
translator_ar_en = pipeline("translation", model="Helsinki-NLP/opus-mt-ar-en", ...)

# Mark complete
update_download_progress("ar_en", "completed", progress=100, downloaded_mb=300, total_mb=300)
```

### Frontend (TypeScript)

**Type Definitions:**
```typescript
interface ModelDownloadProgress {
  status: "pending" | "downloading" | "completed" | "error";
  progress_percent: number;
  downloaded_mb: number;
  total_mb: number;
  error: string | null;
}

interface DownloadProgress {
  ar_en: ModelDownloadProgress;
  en_ar: ModelDownloadProgress;
}
```

**File Size Formatter:**
```typescript
const formatFileSize = (mb: number): string => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
};
```

**Usage:**
```typescript
formatFileSize(298.45)    // "298.45 MB"
formatFileSize(1536)      // "1.50 GB"
formatFileSize(0)         // "0.00 MB"
```

## Progress Bar Styling

### Downloading State (Blue)
```css
bg-gray-200 rounded-full h-2.5 (container)
bg-blue-600 h-2.5 rounded-full (progress)
```

### Completed State (Green)
```css
bg-green-200 rounded-full h-2.5 (container)
bg-green-600 h-2.5 rounded-full w-full (progress)
```

### Animated Transitions
```css
transition-all duration-300
```

## Model Sizes (Approximate)

| Model | Size |
|-------|------|
| `Helsinki-NLP/opus-mt-ar-en` | ~300 MB |
| `Helsinki-NLP/opus-mt-en-ar` | ~300 MB |
| **Total** | **~600 MB** |

> **Note:** Actual sizes may vary slightly based on model version and cache format.

## Download Behavior

### First Startup
1. Service starts with both models in `pending` state
2. Models begin downloading sequentially:
   - Arabic → English first
   - English → Arabic second
3. Status updates to `downloading` with progress tracking
4. Upon completion, status changes to `completed`
5. Models are cached locally in `/root/.cache/huggingface/`

### Subsequent Startups
- Models load from cache almost instantly
- Status goes directly from `pending` → `completed`
- No network download required

### Error Handling
- If download fails, status changes to `error`
- Error message is displayed in the UI
- Service attempts to load remaining models
- Administrator can restart service to retry

## Limitations & Future Improvements

### Current Limitations
1. **No real-time progress**: Progress updates at start/end of download only (not during)
2. **Estimated sizes**: Total MB is estimated, not exact
3. **Sequential loading**: Models load one at a time, not in parallel
4. **No retry mechanism**: Failed downloads require manual service restart

### Planned Improvements
- [ ] Real-time progress tracking during download
- [ ] Parallel model downloading
- [ ] Automatic retry on failure
- [ ] Bandwidth usage display
- [ ] Download speed indicator
- [ ] ETA (estimated time remaining)
- [ ] Pause/resume functionality
- [ ] Manual re-download button
- [ ] Download logs and history

## Troubleshooting

### Models Stuck in "downloading"
**Cause:** Network timeout or interrupted download  
**Solution:** Restart the translation service

### Models Show "error" Status
**Cause:** Network issues, HuggingFace API down, or disk space  
**Solution:** 
1. Check network connectivity
2. Verify disk space (need ~1GB free)
3. Check HuggingFace status: https://status.huggingface.co/
4. Review service logs for detailed error messages

### Progress Not Updating
**Cause:** Frontend not polling health endpoint  
**Solution:** 
1. Enable auto-refresh in the admin dashboard
2. Manually click "Check Health" button
3. Refresh the browser page

### Models Download Every Time
**Cause:** Cache directory not persisted  
**Solution:** Ensure Docker volume is mounted for `/root/.cache/huggingface/`

## Testing

### Simulating Fresh Download
To test the download progress UI, clear the HuggingFace cache:

```bash
# Inside the container
rm -rf /root/.cache/huggingface/hub/models--Helsinki-NLP*

# Restart service
docker-compose restart translation-service
```

### Monitoring Download
Watch the logs while models download:

```bash
docker-compose logs -f translation-service
```

Look for:
```
📥 Loading Arabic→English model (Helsinki-NLP/opus-mt-ar-en)...
⏳ This may take a minute on first run...
✅ Arabic→English model loaded successfully!
```

## Auto-Refresh Recommendation

For the best monitoring experience during model downloads:

1. Navigate to **Admin Dashboard** → **Translation Service**
2. Click **"Monitoring"** tab
3. Enable **"Auto-refresh"** toggle (top right)
4. Progress will update every 30 seconds automatically

## Related Files

- `/apps/translation-service/app.py` - Backend progress tracking
- `/apps/web/components/adminDashboard/sections/translation-service/useTranslationServiceViewModel.ts` - View model with formatters
- `/apps/web/components/adminDashboard/sections/translation-service/TranslationServiceView.tsx` - UI component
- `/apps/translation-service/Dockerfile` - Container configuration

## Environment Variables

No additional environment variables needed for this feature. It works with existing configuration.

## Security Considerations

- Download progress is exposed via the `/health` endpoint
- API key authentication is required to access progress data
- No sensitive information is exposed (only model names and sizes)

## Performance Impact

- **Minimal**: Progress tracking adds ~1KB to health endpoint response
- **No overhead**: Progress updates only happen during model loading
- **Fast queries**: Progress state stored in memory (no database)

---

**Last Updated:** 2025-01-15  
**Version:** 1.0.0  
**Status:** ✅ Implemented and Deployed