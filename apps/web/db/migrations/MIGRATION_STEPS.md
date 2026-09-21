# Push Devices Migration - Step-by-Step Guide

## ⚠️ IMPORTANT: Read Before Running

This guide will help you safely migrate from the old device token arrays in `user_settings` to the new `push_devices` table.

---

## Pre-Migration Checklist

- [ ] **BACKUP YOUR DATABASE** (Critical!)
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file exists and is valid
- [ ] All users are logged out (or at least aware of the migration)
- [ ] You have database admin permissions

---

## Migration Order

**MUST BE RUN IN THIS EXACT ORDER:**

### Phase 1: Create New Table (First Time Only)
### Phase 2: Migrate Data
### Phase 3: Update Application Code
### Phase 4: Drop Old Columns

---

## Phase 1: Create Push Devices Table

### Check if table already exists:

```bash
psql $DATABASE_URL -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_devices');"
```

If returns `t` (true), **SKIP TO PHASE 2**.

If returns `f` (false), **RUN THESE MIGRATIONS**:

```bash
cd apps/web

# Run the create table migration
psql $DATABASE_URL -f db/migrations/2026_01_11_01_create_push_devices_table.sql
```

**Verify table was created:**
```bash
psql $DATABASE_URL -c "\d push_devices"
```

You should see the table structure with columns:
- id, user_id, platform, token, environment, is_active, last_seen_at
- device_id, device_model, app_version, build_number
- created_at, updated_at

---

## Phase 2: Migrate Existing Data

### Option A: Check what data exists first

```bash
psql $DATABASE_URL <<EOF
-- Count iOS tokens
SELECT COUNT(*) as ios_tokens
FROM (
  SELECT unnest(ios_device_token) 
  FROM user_settings 
  WHERE ios_device_token IS NOT NULL
) AS tokens;

-- Count Android tokens
SELECT COUNT(*) as android_tokens
FROM (
  SELECT unnest(android_device_token) 
  FROM user_settings 
  WHERE android_device_token IS NOT NULL
) AS tokens;
EOF
```

### Option B: Run the data migration

```bash
# Run the data migration
psql $DATABASE_URL -f db/migrations/2026_01_11_02_migrate_device_tokens.sql
```

**Verify migration success:**
```bash
psql $DATABASE_URL <<EOF
-- Check migrated counts
SELECT 
  platform,
  COUNT(*) as device_count,
  COUNT(DISTINCT user_id) as user_count
FROM push_devices
GROUP BY platform;

-- Check for any null tokens (shouldn't be any)
SELECT COUNT(*) as null_tokens
FROM push_devices
WHERE token IS NULL OR token = '';
EOF
```

---

## Phase 3: Update Application Code

### Deploy Updated Code

The following files have already been updated to use `push_devices`:

1. **API Routes:**
   - ✅ `apps/web/app/api/user/device-token/route.ts`
   - ✅ `apps/web/app/api/admin/push-devices/route.ts`
   - ✅ `apps/web/app/api/admin/push-devices/[id]/route.ts`

2. **Go Notification Server:**
   - ✅ `apps/notifications-server/push.go`
   - ✅ `apps/notifications-server/types.go`

3. **Database Schema:**
   - ✅ `apps/web/db/schema/pushDevices.ts`
   - ✅ `apps/web/db/schema/userSettings.ts` (device tokens removed)

4. **Mobile App:**
   - ✅ `apps/mobile/src/services/PushNotificationService.ts`

### Deployment Steps:

```bash
# 1. Build and deploy Next.js app
cd apps/web
npm run build
# Deploy to your hosting (Vercel, etc.)

# 2. Build and deploy Go server
cd apps/notifications-server
go build
# Deploy binary to your server
sudo systemctl restart notifications-server  # or your deployment method
```

---

## Phase 4: Testing Period (CRITICAL)

### Before dropping old columns, test for 48-72 hours:

**Test Checklist:**

```bash
# Test 1: Register a device from mobile app
# - Log into mobile app
# - Check if device appears in push_devices table
psql $DATABASE_URL -c "SELECT * FROM push_devices ORDER BY created_at DESC LIMIT 5;"

# Test 2: Send a push notification
# - Trigger any notification event
# - Verify notification is received on mobile device
# - Check Go server logs for success

# Test 3: Check for errors
# - Review Next.js logs
# - Review Go server logs
# - Check for any "column does not exist" errors

# Test 4: Verify old columns are not being used
# - Check application logs for references to ios_device_token or android_device_token
# - Should see NO references

# Test 5: Compare device counts
psql $DATABASE_URL <<EOF
-- Devices in new table
SELECT COUNT(*) as new_table_count FROM push_devices WHERE is_active = true;

-- Devices in old columns (should still exist for now)
SELECT COUNT(*) as old_ios_count
FROM (SELECT unnest(ios_device_token) FROM user_settings WHERE ios_device_token IS NOT NULL) AS t;

SELECT COUNT(*) as old_android_count
FROM (SELECT unnest(android_device_token) FROM user_settings WHERE android_device_token IS NOT NULL) AS t;
EOF
```

**✅ If all tests pass for 48-72 hours, proceed to Phase 5**  
**❌ If any test fails, DO NOT proceed to Phase 5. Debug first.**

---

## Phase 5: Drop Old Columns (FINAL STEP)

### ⚠️ THIS IS IRREVERSIBLE - ONLY RUN IF PHASE 4 TESTS PASSED

**Final confirmation checklist:**
- [ ] Push notifications working perfectly for 48+ hours
- [ ] No errors in application logs
- [ ] All tests in Phase 4 passed
- [ ] Team consensus to proceed
- [ ] Recent backup created (less than 1 hour old)

### Run the Drizzle-generated migration:

```bash
cd apps/web

# This will drop the old columns
npm run db:push

# Or run the SQL migration directly
psql $DATABASE_URL -f db/migrations/0006_wealthy_nova.sql
```

### Verify columns are dropped:

```bash
psql $DATABASE_URL -c "\d user_settings"
```

You should NOT see:
- `ios_device_token`
- `android_device_token`

You SHOULD still see:
- `push_notifications_enabled` (this stays!)

---

## Verification Queries

### After completing all phases, run these to verify everything:

```sql
-- 1. Check push_devices table has data
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE platform = 'ios') as ios,
  COUNT(*) FILTER (WHERE platform = 'android') as android
FROM push_devices;

-- 2. Check user_settings no longer has device token columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name IN ('ios_device_token', 'android_device_token');
-- Should return 0 rows

-- 3. Verify push_notifications_enabled still exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name = 'push_notifications_enabled';
-- Should return 1 row

-- 4. Check for orphaned devices (no user)
SELECT COUNT(*) as orphaned_devices
FROM push_devices
WHERE user_id IS NULL;

-- 5. Users with multiple devices (normal)
SELECT 
  user_id,
  COUNT(*) as device_count,
  ARRAY_AGG(platform) as platforms
FROM push_devices
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY device_count DESC
LIMIT 10;
```

---

## Rollback Plan (Emergency Only)

### If you need to rollback BEFORE dropping columns:

1. **Stop new deployments** - Revert to previous version

2. **Restore old API behavior** (if needed):
   ```bash
   git revert <commit-hash>
   # Redeploy old version
   ```

3. **The data is safe** - Both systems can coexist temporarily

### If you already dropped columns:

1. **Restore from backup:**
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Or rebuild arrays from push_devices:**
   ```sql
   -- Rebuild ios_device_token array
   ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ios_device_token TEXT[];
   
   UPDATE user_settings us
   SET ios_device_token = (
     SELECT ARRAY_AGG(token)
     FROM push_devices
     WHERE user_id = us.user_id
       AND platform = 'ios'
       AND is_active = true
   );

   -- Rebuild android_device_token array
   ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS android_device_token TEXT[];
   
   UPDATE user_settings us
   SET android_device_token = (
     SELECT ARRAY_AGG(token)
     FROM push_devices
     WHERE user_id = us.user_id
       AND platform = 'android'
       AND is_active = true
   );
   ```

---

## Common Issues & Solutions

### Issue 1: "column does not exist" error

**Symptom:** Application logs show `column "ios_device_token" does not exist`

**Cause:** Application code still references old columns

**Solution:**
- Make sure all code is updated and deployed
- Check for any cached queries
- Restart application servers

### Issue 2: Devices not appearing in push_devices

**Symptom:** Mobile app registers but devices not in table

**Cause:** API route not updated or deployment failed

**Solution:**
- Verify API route is deployed: `curl https://yourapp.com/api/user/device-token`
- Check Next.js deployment logs
- Test API manually with curl/Postman

### Issue 3: Duplicate devices

**Symptom:** Same token appears multiple times

**Cause:** Migration ran twice, or unique constraint missing

**Solution:**
```sql
-- Check for duplicates
SELECT token, platform, environment, COUNT(*)
FROM push_devices
GROUP BY token, platform, environment
HAVING COUNT(*) > 1;

-- Remove duplicates (keep most recent)
DELETE FROM push_devices a USING push_devices b
WHERE a.id < b.id
  AND a.token = b.token
  AND a.platform = b.platform
  AND a.environment = b.environment;
```

### Issue 4: Go server still using old columns

**Symptom:** Go server errors about arrays

**Cause:** Old binary still running

**Solution:**
```bash
# Rebuild Go server
cd apps/notifications-server
go build

# Restart service
sudo systemctl restart notifications-server

# Check logs
sudo journalctl -u notifications-server -f
```

---

## Success Criteria

✅ **Migration is complete when:**

1. `push_devices` table exists and has data
2. Old device token columns are dropped from `user_settings`
3. Push notifications work from mobile app
4. Go server sends notifications successfully
5. Admin can view devices in admin dashboard
6. No errors in application logs
7. All tests pass

---

## Timeline Recommendation

- **Day 1**: Run Phase 1 & 2 (create table, migrate data)
- **Day 1-3**: Deploy Phase 3 (updated code)
- **Day 1-3**: Monitor and test (Phase 4)
- **Day 4**: Drop old columns (Phase 5) - ONLY if all tests pass

**Do not rush Phase 5!** It's better to keep old columns for a week if unsure.

---

## Support

If you encounter issues:

1. Check application logs (Next.js, Go server)
2. Review database query logs
3. Verify all migrations ran successfully
4. Check the comprehensive documentation:
   - `PUSH_DEVICES_MIGRATION_GUIDE.md`
   - `PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md`
   - `PUSH_DEVICES_QUICK_START.md`

---

**Migration Created:** 2026-01-11  
**Status:** Ready for Execution  
**Estimated Time:** 1-4 days (including testing period)