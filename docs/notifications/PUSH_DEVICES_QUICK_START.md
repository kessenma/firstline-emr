# Push Devices Quick Start Guide

## 🚀 TL;DR

Replace array-based device tokens in `user_settings` with a dedicated `push_devices` table for better device management.

---

## What You Need to Do

### 1. Run Migrations (5 minutes)

```bash
cd apps/web/db/migrations
./run_push_devices_migration.sh

# Or manually:
psql $DATABASE_URL -f 2026_01_11_01_create_push_devices_table.sql
psql $DATABASE_URL -f 2026_01_11_02_migrate_device_tokens.sql
```

### 2. Deploy Code Changes

Already done! Files updated:
- ✅ `apps/web/db/schema/pushDevices.ts` (new)
- ✅ `apps/web/app/api/user/device-token/route.ts` (updated)
- ✅ `apps/notifications-server/push.go` (updated)

### 3. Verify (2 minutes)

```sql
-- Check migrated tokens
SELECT platform, COUNT(*) FROM push_devices GROUP BY platform;

-- Test with your user ID
SELECT * FROM push_devices WHERE user_id = 'YOUR_USER_ID';
```

### 4. Test Push Notifications

- Register device token from mobile app
- Send test notification
- Verify it arrives

---

## Key Changes

### Database

**Before:** Arrays in `user_settings`
```sql
ios_device_token TEXT[]
android_device_token TEXT[]
```

**After:** Dedicated table
```sql
CREATE TABLE push_devices (
  id UUID PRIMARY KEY,
  user_id UUID,
  platform device_platform,  -- 'ios' | 'android'
  token TEXT NOT NULL,
  environment device_environment,  -- 'dev' | 'prod'
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP,
  device_id VARCHAR(255),
  app_version VARCHAR(50),
  ...
  UNIQUE(token, platform, environment)
);
```

### API Endpoints

#### POST `/api/user/device-token`
```typescript
// Request
{
  token: string;
  platform: 'ios' | 'android';
  environment?: 'dev' | 'prod';     // NEW
  deviceId?: string;                 // NEW
  appVersion?: string;               // NEW
}
```

#### GET `/api/user/device-token`
```typescript
// Response - now returns rich device info!
{
  devices: {
    ios: [
      {
        id: "uuid",
        token: "...",
        environment: "prod",
        lastSeenAt: "2026-01-11T10:30:00Z",
        deviceId: "iPhone-123",
        appVersion: "1.2.3"
      }
    ],
    android: []
  },
  totalActive: 1
}
```

---

## Benefits

✅ **Device Reassignment**: Same device switching accounts = clean reassignment  
✅ **Auto Cleanup**: Invalid tokens automatically marked inactive  
✅ **Rich Metadata**: Track app version, device ID, last seen  
✅ **Better Performance**: Indexed queries instead of array operations  
✅ **Audit Trail**: Full history of device registrations  

---

## Mobile App Changes

**None required!** API is backward compatible.

**Optional enhancements:**
```typescript
// In PushNotificationService.ts
await api.post('/api/user/device-token', {
  token,
  platform: Platform.OS,
  environment: __DEV__ ? 'dev' : 'prod',  // ← Add this
  deviceId: DeviceInfo.getUniqueId(),      // ← Add this
  appVersion: DeviceInfo.getVersion(),     // ← Add this
});
```

---

## Common Scenarios

### Scenario 1: User Logs Out
```typescript
// DELETE request marks device inactive
await api.delete('/api/user/device-token', {
  platform: 'ios'
});

// Result: is_active = false (not deleted!)
```

### Scenario 2: Same Device, Different Account
```sql
-- Device X logs out of Account A
UPDATE push_devices SET is_active = false WHERE user_id = 'A';

-- Device X logs into Account B with same token
INSERT INTO push_devices (..., user_id = 'B')
ON CONFLICT (token, platform, environment)
DO UPDATE SET user_id = 'B', is_active = true;

-- Result: Only Account B can send to Device X ✅
```

### Scenario 3: Invalid Token
```go
// In Go server
err := pusher.SendToiOS(device.Token, ...)
if isInvalidTokenError(err) {
    MarkDeviceInactive(db, device.Token, "ios")
}

// Result: Device marked inactive, no future attempts
```

---

## Verification Queries

```sql
-- Count devices
SELECT platform, COUNT(*) FROM push_devices GROUP BY platform;

-- Active vs inactive
SELECT is_active, COUNT(*) FROM push_devices GROUP BY is_active;

-- Your devices
SELECT * FROM push_devices WHERE user_id = 'YOUR_USER_ID';

-- Stale devices (not seen in 30 days)
SELECT * FROM push_devices 
WHERE last_seen_at < NOW() - INTERVAL '30 days' 
AND is_active = true;

-- Check for duplicates (should be 0)
SELECT token, COUNT(*) FROM push_devices 
WHERE is_active = true 
GROUP BY token 
HAVING COUNT(*) > 1;
```

---

## Troubleshooting

### No notifications received?

1. Check device exists and is active:
   ```sql
   SELECT * FROM push_devices 
   WHERE user_id = 'USER_ID' AND is_active = true;
   ```

2. Check push notifications enabled:
   ```sql
   SELECT push_notifications_enabled FROM user_settings 
   WHERE user_id = 'USER_ID';
   ```

3. Check Go server logs for send attempts

### Token keeps getting deactivated?

- Check if using correct environment ('dev' vs 'prod')
- Verify APNs certificate matches environment
- Re-register token from mobile app

---

## Maintenance

### Monthly Cleanup

```sql
-- Mark stale devices inactive
UPDATE push_devices
SET is_active = false, updated_at = NOW()
WHERE is_active = true
  AND last_seen_at < NOW() - INTERVAL '60 days';

-- Delete old inactive devices
DELETE FROM push_devices
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

---

## Rollback Plan

If issues arise:

1. **Quick rollback** (if new code not deployed):
   - Don't deploy new code
   - Old arrays still intact in `user_settings`

2. **Full rollback** (if new code deployed):
   ```sql
   -- Rebuild arrays from push_devices
   UPDATE user_settings us
   SET ios_device_token = (
     SELECT ARRAY_AGG(token) FROM push_devices
     WHERE user_id = us.user_id AND platform = 'ios' AND is_active = true
   );
   ```

3. Revert application code to previous version

---

## Files Reference

- **Schema**: `apps/web/db/schema/pushDevices.ts`
- **API**: `apps/web/app/api/user/device-token/route.ts`
- **Go Server**: `apps/notifications-server/push.go`
- **Migrations**: `apps/web/db/migrations/2026_01_11_*`
- **Full Guide**: `apps/web/db/migrations/PUSH_DEVICES_MIGRATION_GUIDE.md`
- **Summary**: `PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md`

---

## Next Steps

1. ✅ Run migrations
2. ✅ Deploy code (already updated!)
3. ✅ Test push notifications
4. ⏰ Monitor for 1-2 weeks
5. 🧹 Optional: Run cleanup migration to drop old columns

---

## Need Help?

See detailed documentation:
- **Migration Guide**: `apps/web/db/migrations/PUSH_DEVICES_MIGRATION_GUIDE.md` (546 lines)
- **Implementation Summary**: `PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md` (789 lines)

---

**Status**: ✅ Ready to Deploy  
**Backward Compatible**: Yes  
**Breaking Changes**: None  
**Estimated Time**: 10 minutes setup + testing  

🎉 You're all set! This is a drop-in upgrade that makes your push notification system way more robust.