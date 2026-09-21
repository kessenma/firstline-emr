# CORS Fix for Audio Files

## Problem

Audio files from RustFS object storage were failing to load in the frontend with the error:

```
Access to fetch at 'https://s3.emr.fajr.org/fajr-media/prod/audio/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header contains multiple values '*, *', 
but only one is allowed.
```

## Root Cause

**Duplicate CORS headers** were being set:
1. RustFS (MinIO-based) was setting CORS headers: `Access-Control-Allow-Origin: *`
2. Caddy reverse proxy was also setting CORS headers: `Access-Control-Allow-Origin: *`
3. Result: `Access-Control-Allow-Origin: *, *` ❌

Images worked because `<img>` tags handle CORS differently than `fetch()` requests.

## Solution Implemented

**Proxy audio files through Next.js backend** to bypass RustFS CORS issues entirely.

### Changes Made

#### 1. Backend: Updated `/api/telegram-thread/get-media/route.ts`

Added a `proxy=true` query parameter option that streams files through the Next.js backend instead of returning signed URLs:

```typescript
// For images (works fine with signed URLs)
GET /api/telegram-thread/get-media?filePath=prod/images/123/photo.jpg
Response: { signedUrl: "https://s3.emr.fajr.org/..." }

// For audio (proxied through backend to avoid CORS)
GET /api/telegram-thread/get-media?filePath=prod/audio/123/voice.ogg&proxy=true
Response: <binary audio stream with proper CORS headers>
```

The proxy mode:
- Fetches file from RustFS server-side (no CORS issues)
- Sets proper CORS headers: `Access-Control-Allow-Origin: *`
- Streams the file to the frontend as a blob
- Frontend creates an object URL from the blob

#### 2. Frontend: Updated `useMediaManager.tsx`

Modified the media manager to automatically use proxy mode for audio files:

```typescript
const useProxy = message.type === "audio";
const url = useProxy
  ? `/api/telegram-thread/get-media?filePath=${encodeURIComponent(message.mediaUrl)}&proxy=true`
  : `/api/telegram-thread/get-media?filePath=${encodeURIComponent(message.mediaUrl)}`;
```

For audio files:
- Fetches through proxy endpoint
- Receives blob response
- Creates object URL: `blob:http://localhost:3000/...`
- No CORS issues because it's same-origin

For images:
- Uses signed URLs as before (they work fine)

## Why This Works

1. **Server-side fetch**: Next.js backend fetches from RustFS (no CORS needed for server-to-server)
2. **Clean CORS headers**: Next.js sets ONE clean `Access-Control-Allow-Origin: *` header
3. **Same-origin blob**: Frontend gets a blob URL that's same-origin (`blob:http://localhost:3000/...`)
4. **No RustFS interaction**: Frontend never directly fetches from RustFS for audio files

## Performance Considerations

**Trade-off**: Audio files now go through the Next.js backend instead of direct S3 URLs.

**Impact**:
- ✅ Solves CORS issues completely
- ✅ No changes needed to production RustFS/Caddy config
- ⚠️ Adds latency (backend → RustFS → backend → frontend)
- ⚠️ Uses backend bandwidth/memory for audio streaming

**Acceptable because**:
- Audio files are relatively small (typically < 1MB)
- This is a temporary workaround until production CORS is fixed properly
- User experience is more important than optimal performance

## Proper Long-term Fix (Production Server)

To fix this properly on the production server hosting RustFS:

### Option 1: Fix Caddy Labels (Recommended)

Update `docker-compose.object-storage.yml` on the production server:

```yaml
services:
  rustfs-server:
    labels:
      caddy: ${OBJECT_STORAGE_ENDPOINT}
      caddy.reverse_proxy: "{{upstreams ${OBJECT_STORAGE_PORT:-9100}}}"
      
      # Remove all CORS headers from RustFS upstream
      caddy.reverse_proxy.header_down.-access-control-allow-origin: ""
      caddy.reverse_proxy.header_down.-access-control-allow-methods: ""
      caddy.reverse_proxy.header_down.-access-control-allow-headers: ""
      caddy.reverse_proxy.header_down.-access-control-expose-headers: ""
      
      # Set clean CORS headers from Caddy
      caddy.header.Access-Control-Allow-Origin: "*"
      caddy.header.Access-Control-Allow-Methods: "GET, POST, PUT, DELETE, OPTIONS, HEAD"
      caddy.header.Access-Control-Allow-Headers: "Authorization, Content-Type, Range, X-Amz-*"
      caddy.header.Access-Control-Expose-Headers: "ETag, Content-Length, Content-Range"
```

Then restart:
```bash
docker-compose -f docker-compose.object-storage.yml down
docker-compose -f docker-compose.object-storage.yml up -d
```

### Option 2: Disable RustFS CORS

If using a Caddyfile instead of labels:

```caddyfile
s3.emr.fajr.org {
    reverse_proxy rustfs-server:9100 {
        # Strip all CORS headers from upstream
        header_down -Access-Control-Allow-Origin
        header_down -Access-Control-Allow-Methods
        header_down -Access-Control-Allow-Headers
        header_down -Access-Control-Expose-Headers
    }
    
    # Set clean CORS headers
    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, HEAD"
    header Access-Control-Allow-Headers "Authorization, Content-Type, Range, X-Amz-*"
    header Access-Control-Expose-Headers "ETag, Content-Length, Content-Range"
}
```

### Verify the Fix

After applying changes on production:

```bash
# Test CORS headers
curl -I "https://s3.emr.fajr.org/fajr-media/prod/audio/test-file" \
  -H "Origin: http://localhost:3000"

# Should see ONLY ONE Access-Control-Allow-Origin header:
# access-control-allow-origin: *
```

If you see two headers, the fix didn't work.

## Files Modified

1. `apps/web/app/api/telegram-thread/get-media/route.ts` - Added proxy mode
2. `apps/web/components/patient-chart/telegram-messages/view/useMediaManager.tsx` - Use proxy for audio
3. `docker-compose.object-storage.yml` - Updated CORS header stripping (for local/future deployments)

## Testing

1. **Audio playback**: ✅ Works with no CORS errors
2. **Image display**: ✅ Still works with signed URLs
3. **Audio conversion**: ✅ FFmpeg conversion works with proxied URLs
4. **Performance**: ✅ Acceptable latency for audio playback

## Rollback

If needed, revert by removing `&proxy=true` from the audio fetch in `useMediaManager.tsx`:

```typescript
const url = `/api/telegram-thread/get-media?filePath=${encodeURIComponent(message.mediaUrl)}`;
```

But this will bring back the CORS errors until production server CORS is fixed properly.

## Next Steps

1. ✅ **Done**: Audio files work via proxy
2. 🔄 **To Do**: Fix production RustFS CORS configuration (see "Proper Long-term Fix" above)
3. 🔄 **To Do**: Once production CORS is fixed, remove proxy mode for better performance

---

**Status**: ✅ Working Solution (Workaround)  
**Date**: 2025-12-26  
**Author**: AI Assistant + dev@example.com