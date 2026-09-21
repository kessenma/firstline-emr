# Push Devices Migration Guide

## Overview

This guide documents the migration from array-based device token storage in `user_settings` to a dedicated `push_devices` table. This change improves device management, supports token rotation, handles multi-device scenarios, and enables better tracking of invalid tokens.

## Table of Contents

- [Why This Change?](#why-this-change)
- [What Changed](#what-changed)
- [Migration Steps](#migration-steps)
- [Verification](#verification)
- [Rollback Plan](#rollback-plan)
- [API Changes](#api-changes)
- [Mobile App Changes](#mobile-app-changes)
- [FAQ](#faq)

## Why This Change?

### Problems with Array-Based Approach

1. **Device Reassignment**: When the same device logs into multiple accounts, the array approach creates confusion about token ownership
2. **Token Rotation**: No way to track when tokens change or become invalid
3. **Metadata Storage**: Cannot store per-device information (app version, last seen, device ID)
4. **Querying Complexity**: Difficult to query "all iOS tokens" or "tokens not seen in 60 days"
5. **Array Duplicates**: Risk of duplicate tokens in arrays
6. **No Audit Trail**: Cannot track device history or deactivation

### Benefits of `push_devices` Table

1. **One Token = One Row**: Clean mental model matching how push notifications actually work
2. **Device State**: Track `is_active`, `last_seen_at`, `app_version`, etc.
3. **Token Reassignment**: When a device logs into a different account, the row simply updates `user_id`
4. **Automatic Cleanup**: Can easily deactivate stale devices or invalid tokens
5. **Better Indexing**: Fast queries for "active tokens for user X"
6. **Audit Trail**: Full history of device registrations and deactivations

## What Changed

### Database Schema

**Old (user_settings table):**
```sql
CREATE TABLE user_settings (
  ...
  ios_device_token TEXT[],
  android_device_token TEXT[],
  push_notifications_enabled BOOLEAN DEFAULT true,
  ...
);
```

**New (push_devices table):**
```sql
CREATE TABLE push_devices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform device_platform NOT NULL,  -- 'ios' | 'android'
  token TEXT NOT NULL,
  environment device_environment DEFAULT 'prod' NOT NULL,  -- 'dev' | 'prod'
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_seen_at TIMESTAMP DEFAULT now() NOT NULL,
  device_id VARCHAR(255),  -- Optional: Vendor ID or install ID
  app_version VARCHAR(50),
  build_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(token, platform, environment)
);
```

### Key Features

- **Enums**: `device_platform` ('ios', 'android') and `device_environment` ('dev', 'prod')
- **Unique Constraint**: Ensures one token per platform/environment combo
- **Nullable `user_id`**: Supports pre-login token registration
- **Indexes**: Optimized for common queries (user_id + is_active, token, last_seen_at)

## Migration Steps

### Step 1: Create the New Table

Run migration file: `2026_01_11_01_create_push_devices_table.sql`

```bash
cd apps/web
# If using Drizzle Kit:
npm run db:migrate

# Or run SQL directly:
psql -d your_database -f db/migrations/2026_01_11_01_create_push_devices_table.sql
```

This creates:
- `device_platform` enum
- `device_environment` enum
- `push_devices` table
- Required indexes and constraints

### Step 2: Migrate Existing Data

Run migration file: `2026_01_11_02_migrate_device_tokens.sql`

```bash
psql -d your_database -f db/migrations/2026_01_11_02_migrate_device_tokens.sql
```

This migration:
- Unnests all iOS tokens from `user_settings.ios_device_token[]`
- Unnests all Android tokens from `user_settings.android_device_token[]`
- Creates one `push_devices` row per token
- Sets `environment` to 'prod' by default
- Handles duplicate tokens gracefully with `ON CONFLICT DO NOTHING`
- Logs migration results

### Step 3: Deploy Updated Application Code

Deploy the following changes (already included in this PR):

1. **API Routes** (`apps/web/app/api/user/device-token/route.ts`):
   - POST: Upserts device token with reassignment logic
   - GET: Returns grouped active devices
   - DELETE: Deactivates devices (doesn't delete)
   - PATCH: Reactivates devices

2. **Go Notification Server** (`apps/notifications-server/push.go`):
   - Queries `push_devices` table instead of `user_settings` arrays
   - Automatically marks invalid tokens as inactive
   - Better error handling and logging

3. **Schema** (`apps/web/db/schema/pushDevices.ts`):
   - New Drizzle schema for `push_devices`
   - Exported types: `PushDevice`, `NewPushDevice`

### Step 4: Monitor Both Systems (Dual Write Period - Optional)

For extra safety, you can temporarily write to both systems:

```typescript
// Register token to BOTH old and new systems
await db.insert(pushDevices).values({...}); // New
await db.update(userSettings).set({...});   // Old (fallback)
```

This gives you a rollback option. After 1-2 weeks of verified operation, remove the old writes.

### Step 5: Verify Migration Success

See [Verification](#verification) section below.

### Step 6: Clean Up Old Columns (Optional)

**⚠️ ONLY after thorough testing and verification!**

Run migration file: `2026_01_11_03_cleanup_old_device_tokens.sql`

This migration:
- Adds deprecation comments to old columns
- Provides commented-out DROP COLUMN statements
- Only execute the drops after you're 100% confident

## Verification

### 1. Check Token Counts Match

```sql
-- Count migrated iOS tokens
SELECT COUNT(*) FROM push_devices WHERE platform = 'ios';

-- Count original iOS tokens
SELECT COUNT(*)
FROM (
  SELECT unnest(ios_device_token)
  FROM user_settings
  WHERE ios_device_token IS NOT NULL
) AS tokens;

-- Repeat for Android
SELECT COUNT(*) FROM push_devices WHERE platform = 'android';

SELECT COUNT(*)
FROM (
  SELECT unnest(android_device_token)
  FROM user_settings
  WHERE android_device_token IS NOT NULL
) AS tokens;
```

### 2. Verify Active Devices Per User

```sql
-- Check a specific user's devices
SELECT
  id,
  platform,
  token,
  environment,
  is_active,
  last_seen_at
FROM push_devices
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY last_seen_at DESC;
```

### 3. Test Push Notifications

1. **Mobile App**: Register a device token
2. **Backend**: Verify row appears in `push_devices`
3. **Send Test**: Trigger a push notification
4. **Verify**: Check notification arrives on device
5. **Check Logs**: Review Go server logs for successful sends

### 4. Test Device Reassignment

1. Log into Account A on Device X → token registered
2. Log out of Account A
3. Log into Account B on same Device X → token should reassign to Account B
4. Send notification to Account B → should arrive on Device X
5. Send notification to Account A → should NOT arrive on Device X

### 5. Test Invalid Token Handling

1. Register a fake/invalid token in `push_devices`
2. Send a push notification to that user
3. Verify the Go server marks the device as inactive (`is_active = false`)
4. Confirm no more attempts to send to that token

## Rollback Plan

If you need to rollback:

### Quick Rollback (If New Code Not Deployed)

Simply don't deploy the new API/Go server code. The old arrays in `user_settings` are still intact.

### Full Rollback (If New Code Already Deployed)

1. **Revert application code** to previous version
2. **Restore array data** (if you ran cleanup migration):

```sql
-- Rebuild ios_device_token array from push_devices
UPDATE user_settings us
SET ios_device_token = (
  SELECT ARRAY_AGG(token)
  FROM push_devices
  WHERE user_id = us.user_id
    AND platform = 'ios'
    AND is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM push_devices
  WHERE user_id = us.user_id AND platform = 'ios'
);

-- Rebuild android_device_token array from push_devices
UPDATE user_settings us
SET android_device_token = (
  SELECT ARRAY_AGG(token)
  FROM push_devices
  WHERE user_id = us.user_id
    AND platform = 'android'
    AND is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM push_devices
  WHERE user_id = us.user_id AND platform = 'android'
);
```

3. **Optional**: Drop `push_devices` table if needed

```sql
DROP TABLE IF EXISTS push_devices CASCADE;
DROP TYPE IF EXISTS device_platform;
DROP TYPE IF EXISTS device_environment;
```

## API Changes

### POST `/api/user/device-token` (Register/Update)

**Before:**
```json
{
  "token": "DEVICE_TOKEN_HERE",
  "platform": "ios"
}
```

**After:**
```json
{
  "token": "DEVICE_TOKEN_HERE",
  "platform": "ios",
  "environment": "prod",      // NEW: 'dev' or 'prod'
  "deviceId": "ABCD-1234",     // NEW: Optional vendor ID
  "appVersion": "1.2.3",       // NEW: Optional
  "buildNumber": "42"          // NEW: Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "device": {
    "id": "uuid-here",
    "platform": "ios",
    "environment": "prod"
  }
}
```

### GET `/api/user/device-token` (Retrieve Devices)

**Before:**
```json
{
  "deviceTokens": {
    "ios": ["TOKEN1", "TOKEN2"],
    "android": null
  }
}
```

**After:**
```json
{
  "devices": {
    "ios": [
      {
        "id": "uuid-1",
        "token": "TOKEN1",
        "environment": "prod",
        "lastSeenAt": "2026-01-11T10:30:00Z",
        "deviceId": "ABCD-1234",
        "appVersion": "1.2.3"
      },
      {
        "id": "uuid-2",
        "token": "TOKEN2",
        "environment": "dev",
        "lastSeenAt": "2026-01-10T15:20:00Z",
        "deviceId": "EFGH-5678",
        "appVersion": "1.2.2"
      }
    ],
    "android": []
  },
  "totalActive": 2
}
```

### DELETE `/api/user/device-token` (Deactivate)

**Before:**
```json
{
  "platform": "ios"  // Removes all iOS tokens
}
```

**After:**
```json
{
  "token": "SPECIFIC_TOKEN",    // Optional: Deactivate specific token
  "platform": "ios",             // Optional: Deactivate all for platform
  "deviceId": "ABCD-1234"        // Optional: Deactivate by device ID
  // Or omit all to deactivate all user's devices
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device token(s) deactivated successfully",
  "deactivatedCount": 2
}
```

### NEW: PATCH `/api/user/device-token` (Reactivate)

```json
{
  "deviceId": "uuid-here"
}
```

## Mobile App Changes

### Minimal Changes Required

The mobile app's device registration code should continue to work with minimal changes:

**Current code in `PushNotificationService.ts`:**
```typescript
await this.sendTokenToBackend(deviceToken);
```

**Enhanced (optional):**
```typescript
await this.sendTokenToBackend(deviceToken, {
  environment: __DEV__ ? 'dev' : 'prod',  // Distinguish dev vs prod builds
  deviceId: DeviceInfo.getUniqueId(),      // If using react-native-device-info
  appVersion: DeviceInfo.getVersion(),
  buildNumber: DeviceInfo.getBuildNumber(),
});
```

The API is backward compatible, so existing mobile apps will continue to work without changes.

## FAQ

### Q: What happens to tokens during migration?

All existing tokens are preserved. The migration unnests array elements and creates individual rows. No tokens are lost.

### Q: Do I need to update my mobile app?

No, the API is backward compatible. Existing mobile apps will continue to work. However, updating to send additional metadata (environment, deviceId, appVersion) is recommended.

### Q: What if the same device logs into multiple accounts?

The device token will be reassigned to the most recent account. The `unique(token, platform, environment)` constraint ensures each token belongs to only one user at a time.

### Q: How do invalid tokens get cleaned up?

The Go notification server automatically marks tokens as inactive (`is_active = false`) when APNs/FCM reports them as invalid. You can periodically delete old inactive devices:

```sql
-- Delete devices inactive for more than 90 days
DELETE FROM push_devices
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

### Q: Can I still use the old array columns?

Yes, temporarily. The cleanup migration is optional and commented out by default. However, it's recommended to fully migrate to avoid confusion.

### Q: What if I need to rollback?

See the [Rollback Plan](#rollback-plan) section. The old columns remain intact until you explicitly run the cleanup migration.

### Q: How do I handle dev vs prod APNs certificates?

Use the `environment` field:
- Set to `'dev'` for development builds
- Set to `'prod'` for production/TestFlight builds

This ensures tokens are sent to the correct APNs environment.

### Q: What about pre-login token registration?

The `user_id` field is nullable, allowing tokens to be registered before login. After login, the token can be associated with the user via upsert.

### Q: How do I test this locally?

1. Use a simulator token (iOS/Android emulator)
2. Register it via the API
3. Check `push_devices` table
4. Use the Push Notifications Monitor View in your web app
5. Send a test notification

### Q: What's the performance impact?

Positive! Querying individual rows with indexes is faster than unnesting arrays. The indexes on `(user_id, is_active)` and `token` make lookups very efficient.

## Maintenance Tasks

### Clean Up Stale Devices

Run periodically (e.g., monthly):

```sql
-- Mark devices not seen in 60 days as inactive
UPDATE push_devices
SET is_active = false, updated_at = NOW()
WHERE is_active = true
  AND last_seen_at < NOW() - INTERVAL '60 days';

-- Delete devices inactive for 90+ days
DELETE FROM push_devices
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

### Monitor Device Counts

```sql
-- Active devices per platform
SELECT
  platform,
  environment,
  COUNT(*) as active_devices
FROM push_devices
WHERE is_active = true
GROUP BY platform, environment;

-- Users with multiple devices
SELECT
  user_id,
  COUNT(*) as device_count,
  ARRAY_AGG(platform) as platforms
FROM push_devices
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY device_count DESC;
```

### Find Duplicate Tokens (Should be None)

```sql
-- Should return 0 rows due to unique constraint
SELECT token, platform, environment, COUNT(*)
FROM push_devices
WHERE is_active = true
GROUP BY token, platform, environment
HAVING COUNT(*) > 1;
```

## Support

If you encounter issues during migration:

1. Check the verification queries above
2. Review application logs (both Next.js and Go server)
3. Check the Push Notifications Monitor View in the web app
4. Verify database constraints are properly created
5. Test with a single device/user first before rolling out

## Timeline

- **2026-01-11**: Initial migration created
- **2026-01-11 - 2026-01-18**: Testing and verification period
- **2026-01-18+**: Optional cleanup migration (remove old columns)

---

**Last Updated**: 2026-01-11  
**Migration Author**: Kyle Essenmacher  
**Status**: ✅ Ready for Testing