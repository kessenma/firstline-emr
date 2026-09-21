# 🪣 Auto-Bucket Creation Feature

## Overview

RustFS now automatically creates the configured bucket on startup! No more manual bucket creation or "NoSuchBucket" errors.

## What's New

### ✅ Before (Manual Process)
1. Deploy RustFS
2. Wait for it to start
3. Manually create bucket using mc/console/AWS CLI
4. Restart web app
5. Hope you didn't typo the bucket name

### ✅ After (Automatic)
1. Deploy RustFS
2. **Bucket is automatically created!** 🎉
3. See bucket status in deployment logs
4. Everything just works

## How It Works

The new entrypoint script (`entrypoint.sh`):

1. Starts RustFS server in background
2. Waits for RustFS to be ready (health check)
3. Automatically creates the bucket via S3 API
4. Verifies bucket exists
5. Lists all buckets for confirmation
6. Keeps RustFS running

All of this happens **during container startup** and is **visible in the deployment logs**.

## Deployment Logs You'll See

```
========================================================================
🚀 RustFS Entrypoint - Auto-Bucket Creation
========================================================================

Configuration:
  Address:       :9100
  Port:          9100
  Bucket:        fajr-media
  Region:        us-east-1
  Console:       true
  Domains:       s3.emr.fajr.org
  Access Key:    admi***

========================================================================
📦 Starting RustFS Server
========================================================================

RustFS started with PID: 7

⏳ Waiting for RustFS to be ready...
✅ RustFS is ready!

========================================================================
🪣 Creating Bucket: fajr-media
========================================================================

Checking if bucket 'fajr-media' exists...
Bucket 'fajr-media' does not exist. Creating it...
✅ Bucket 'fajr-media' created successfully!

Bucket 'fajr-media' is ready!

Listing all buckets...
Found buckets:
  - fajr-media

========================================================================
✅ RustFS Startup Complete
========================================================================

API Endpoints:
  - Health: http://localhost:9100/rustfs/health/live
  - S3 API: http://localhost:9100

Web Console:
  - URL: http://localhost:9001/rustfs/console/index.html
  - Username: admin
  - Password: [REDACTED]

Storage:
  - Bucket: fajr-media
  - Region: us-east-1

RustFS is now running. Waiting for signals...
========================================================================
```

## Files Changed

### 1. `apps/object-storage/Dockerfile`
**Before:**
```dockerfile
FROM rustfs/rustfs:latest
WORKDIR /data
EXPOSE 9100 9001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9100/rustfs/health/live
USER 10001
CMD ["/data"]
```

**After:**
```dockerfile
FROM rustfs/rustfs:latest

# Copy entrypoint script
USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /data
EXPOSE 9100 9001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9100/rustfs/health/live
USER 10001
ENTRYPOINT ["/entrypoint.sh"]
```

### 2. `apps/object-storage/entrypoint.sh` (NEW)
- 217 lines of bash script
- Starts RustFS with proper configuration
- Waits for health endpoint
- Creates bucket via S3 API (HTTP PUT request)
- Verifies creation
- Shows status in logs
- Provides manual creation instructions if auto-creation fails

### 3. `docker-compose.object-storage.yml`
**Before:**
```yaml
command:
  - "--address"
  - ":${OBJECT_STORAGE_PORT:-9100}"
  - "--console-enable"
  - "--access-key"
  - "${OBJECT_STORAGE_KEY}"
  - "--secret-key"
  - "${OBJECT_STORAGE_SECRET}"
  - "--server-domains"
  - "${OBJECT_STORAGE_ENDPOINT}"
  - "/data"
```

**After:**
```yaml
# No command override - entrypoint handles everything
```

## Configuration

The entrypoint reads these environment variables:

```bash
# Required
OBJECT_STORAGE_BUCKET=fajr-media              # Bucket to auto-create
OBJECT_STORAGE_KEY=admin                      # Access key
OBJECT_STORAGE_SECRET=YourSecurePassword123!  # Secret key
OBJECT_STORAGE_REGION=us-east-1               # Region

# Optional (with defaults)
RUSTFS_ADDRESS=:9100                          # Port
RUSTFS_CONSOLE_ENABLE=true                    # Enable console
RUSTFS_SERVER_DOMAINS=s3.emr.fajr.org        # Server domain
```

## Benefits

### 1. **Visible in Logs**
You can now **see bucket creation status in deployment logs**. No more guessing!

### 2. **No Manual Steps**
Bucket is created automatically. One less thing to remember.

### 3. **Idempotent**
Safe to restart - if bucket exists, it won't try to recreate it.

### 4. **Informative**
Shows clear status messages, bucket lists, and manual creation instructions if needed.

### 5. **Production Ready**
Works in all environments (local, staging, production).

## What If Auto-Creation Fails?

If auto-creation fails (e.g., network issues, permission problems), the logs will show:

```
⚠️  Could not auto-create bucket via S3 API

Please create the bucket manually using one of these methods:

1. Using MinIO Client (mc) from host machine:
   mc alias set rustfs http://localhost:9100 admin [SECRET_KEY]
   mc mb rustfs/fajr-media

2. Using RustFS Web Console:
   http://localhost:9001/rustfs/console/index.html
   Login with access key: admin

3. Using AWS CLI:
   aws --endpoint-url http://localhost:9100 s3 mb s3://fajr-media
```

The container will **still start successfully** - you just need to create the bucket manually.

## Technical Details

### Bucket Creation Method

The script uses direct S3 API calls via `curl`:

```bash
curl -X PUT \
  --user "$ACCESS_KEY:$SECRET_KEY" \
  "http://localhost:$PORT/$BUCKET/"
```

This is simpler than:
- Installing MinIO Client (mc)
- Managing Python/boto3 dependencies
- Dealing with AWS SDK configuration

It just works with basic HTTP tools available in any container.

### Response Codes

- `200/201` - Bucket created successfully ✅
- `409` - Bucket already exists (also success) ✅
- Other codes - Show manual creation instructions ⚠️

### Startup Sequence

1. Parse environment variables
2. Build RustFS command with all arguments
3. Start RustFS in background (with PID tracking)
4. Poll health endpoint (max 60 seconds)
5. Make S3 PUT request to create bucket
6. Verify bucket exists (list buckets)
7. Show summary and keep RustFS running

### Process Management

The script uses `wait` to keep the container running:

```bash
"$RUSTFS_CMD" "${RUSTFS_ARGS[@]}" &
RUSTFS_PID=$!
# ... create bucket ...
wait $RUSTFS_PID
```

This ensures:
- Container stays alive
- Proper signal handling (SIGTERM, etc.)
- Clean shutdown when RustFS exits

## Deployment

### Next Deployment
Just deploy as normal! The new entrypoint will:
1. Start RustFS
2. Create the bucket
3. Show status in logs

### Verify It's Working
Check your deployment logs for:
```
✅ Bucket 'fajr-media' created successfully!
```

### After Deployment
Restart your web app to ensure it picks up the bucket:
```bash
docker-compose restart web
```

## Troubleshooting

### "Still seeing NoSuchBucket errors"

1. **Check deployment logs** - Did bucket creation succeed?
   ```
   Look for: ✅ Bucket 'fajr-media' created successfully!
   ```

2. **Verify bucket name matches** - Typos are common
   ```bash
   # In .env
   OBJECT_STORAGE_BUCKET=fajr-media
   
   # Check what was created
   mc alias set rustfs http://localhost:9100 admin YourSecurePassword123!
   mc ls rustfs
   ```

3. **Restart web app** - It might have cached the error
   ```bash
   docker-compose restart web
   ```

### "Auto-creation failed"

If you see warning in logs, create bucket manually:

```bash
mc alias set rustfs http://localhost:9100 admin YourSecurePassword123!
mc mb rustfs/fajr-media
docker-compose restart web
```

## Migration from Old Setup

If you're upgrading from the old manual setup:

1. **Your existing bucket is safe** - Script checks if bucket exists first
2. **No data loss** - Existing files remain untouched
3. **No config changes needed** - Same environment variables
4. **Just rebuild and deploy** - That's it!

## Support

- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Quick Reference:** `QUICK_REFERENCE.md`
- **Production Fix:** `PRODUCTION_FIX.md`
- **General Setup:** `README.md`

---

**Status:** ✅ Production Ready  
**Created:** 2024-12-12  
**Impact:** Eliminates manual bucket creation step  
**Risk:** Low - idempotent and safe