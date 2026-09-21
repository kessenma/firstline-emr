# Update PowerSync URL - Quick Guide

## Once You Fix Your PowerSync Server...

After you get your PowerSync server working and know the correct URL, follow these simple steps:

## Step 1: Find the Working URL

Your PowerSync URL will be one of these:

```bash
# Test which one works:

# Option A: Direct IP with port (Coolify external port)
curl http://<DB_HOST>:6061/health
curl http://<DB_HOST>:8080/health

# Option B: Domain (when DNS is configured)
curl https://sync.emr.fajr.org/health

# Option C: Path-based through main domain
curl https://emr.fajr.org/powersync/health
```

The one that returns a response (like `{"status":"ok"}`) is your working URL.

## Step 2: Update Mobile Config

Edit `apps/mobile/src/config/index.ts` and update these two lines:

```typescript
const POWERSYNC_SERVER = {
  URL: 'http://YOUR_WORKING_URL_HERE', // 👈 UPDATE THIS
  ENABLED: true,                        // 👈 CHANGE TO true
};
```

### Examples:

**If direct IP works:**
```typescript
const POWERSYNC_SERVER = {
  URL: 'http://<DB_HOST>:6061',
  ENABLED: true,
};
```

**If domain works:**
```typescript
const POWERSYNC_SERVER = {
  URL: 'https://sync.emr.fajr.org',
  ENABLED: true,
};
```

**If path-based works:**
```typescript
const POWERSYNC_SERVER = {
  URL: 'https://emr.fajr.org/powersync',
  ENABLED: true,
};
```

## Step 3: Enable PowerSync Feature Flags

Edit `apps/mobile/src/config/featureFlags.ts`:

```typescript
export const FeatureFlags: FeatureFlagsType = {
  USE_POWERSYNC: true,              // 👈 Change to true
  POWERSYNC_OFFLINE_MODE: true,     // 👈 Change to true
  
  POWERSYNC_SERVICES: {
    patients: true,                  // 👈 Change to true
    notes: true,
    messages: true,
    notifications: true,
  },
  // ... rest stays the same
};
```

## Step 4: Rebuild and Run

```bash
cd apps/mobile

# Clean build (recommended)
rm -rf ios/build android/build

# Run
pnpm ios
# or
pnpm android
```

## Step 5: Verify Connection

After launching the app:

1. **Log in** (to get JWT token)
2. **Check logs** for:
   ```
   ✅ PowerSyncService initialized successfully
   🔗 Connected to PowerSync server
   ```
3. **Test sync** by creating/editing data

## Quick Verification

Add this to any component to check status:

```typescript
import { useDatabase } from '../contexts/DatabaseContext';
import { getPowerSyncUrl, isPowerSyncEnabled } from '../config';

const MyComponent = () => {
  const { powerSyncService, isInitialized } = useDatabase();
  
  console.log('PowerSync Enabled:', isPowerSyncEnabled());
  console.log('PowerSync URL:', getPowerSyncUrl());
  console.log('Initialized:', isInitialized);
  console.log('Connected:', powerSyncService.isConnected());
  
  return <View>...</View>;
};
```

## Troubleshooting

### Issue: Still can't connect

**Check:**
1. Server is actually running: `docker ps | grep powersync`
2. Health endpoint works: `curl http://YOUR_URL/health`
3. Port is accessible from your dev machine
4. JWT token is valid (log in first)
5. Firewall allows traffic

### Issue: "Unhealthy" status in Docker

**Fix:**
```bash
ssh user@<DB_HOST>
docker logs powersync-mco44c0ook08040g084cswog-192008142198 --tail 200
```

Look for errors and fix them in Coolify dashboard.

### Issue: Auth errors

**Check:**
1. JWT_SECRET matches in both web app and PowerSync server
2. User is logged in
3. Token is stored: Check MMKV storage

## Summary

**Three things to update:**
1. `apps/mobile/src/config/index.ts` → Update `POWERSYNC_SERVER.URL` and set `ENABLED: true`
2. `apps/mobile/src/config/featureFlags.ts` → Set `USE_POWERSYNC: true`
3. Rebuild and run the app

**That's it!** 🎉

---

For detailed troubleshooting, see:
- `POWERSYNC_COOLIFY_FIX.md` - Fix Coolify deployment
- `POWERSYNC_CONNECTION_GUIDE.md` - Comprehensive guide
- `POWERSYNC_QUICKSTART.md` - Quick reference