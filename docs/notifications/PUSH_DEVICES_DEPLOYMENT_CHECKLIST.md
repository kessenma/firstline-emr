# Push Devices Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Review
- [ ] Review `apps/web/db/schema/pushDevices.ts` schema definition
- [ ] Review `apps/web/app/api/user/device-token/route.ts` API changes
- [ ] Review `apps/notifications-server/push.go` Go server changes
- [ ] Review migration SQL files in `apps/web/db/migrations/`
- [ ] Verify all TypeScript files compile without errors
- [ ] Verify Go code compiles without errors

### 2. Database Backup
- [ ] **CRITICAL**: Create full database backup before migration
  ```bash
  pg_dump $DATABASE_URL > backup_before_push_devices_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file is valid and complete
- [ ] Store backup in secure location
- [ ] Document backup location and timestamp

### 3. Environment Preparation
- [ ] Verify `DATABASE_URL` environment variable is set
- [ ] Confirm database user has CREATE/ALTER/INSERT permissions
- [ ] Check available disk space for new table
- [ ] Verify database connection is stable

---

## Migration Execution Checklist

### Step 1: Run Migrations (Estimated: 5-10 minutes)

#### Option A: Automated Script (Recommended)
```bash
cd apps/web/db/migrations
./run_push_devices_migration.sh
```

- [ ] Script executed without errors
- [ ] Migration 1 completed: `push_devices` table created
- [ ] Migration 2 completed: Existing tokens migrated
- [ ] Migration log shows device counts
- [ ] Verification queries passed

#### Option B: Manual Execution
```bash
psql $DATABASE_URL -f apps/web/db/migrations/2026_01_11_01_create_push_devices_table.sql
psql $DATABASE_URL -f apps/web/db/migrations/2026_01_11_02_migrate_device_tokens.sql
```

- [ ] Migration 1 successful: Table and enums created
- [ ] Migration 2 successful: Data migrated
- [ ] No SQL errors in output

### Step 2: Verify Migration Success

Run these queries and check results:

```sql
-- Query 1: Count migrated iOS tokens
SELECT COUNT(*) as ios_count FROM push_devices WHERE platform = 'ios';
```
- [ ] iOS count matches (or is close to) original array count

```sql
-- Query 2: Count migrated Android tokens
SELECT COUNT(*) as android_count FROM push_devices WHERE platform = 'android';
```
- [ ] Android count matches (or is close to) original array count

```sql
-- Query 3: Check for duplicates (should return 0 rows)
SELECT token, platform, environment, COUNT(*)
FROM push_devices
WHERE is_active = true
GROUP BY token, platform, environment
HAVING COUNT(*) > 1;
```
- [ ] Zero duplicate tokens found

```sql
-- Query 4: Verify indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'push_devices';
```
- [ ] `push_devices_user_id_active_idx` exists
- [ ] `push_devices_token_idx` exists
- [ ] `push_devices_last_seen_idx` exists
- [ ] `push_devices_token_platform_env_unique` exists

```sql
-- Query 5: Sample data check
SELECT * FROM push_devices LIMIT 5;
```
- [ ] Data looks correct (user_id, platform, token populated)
- [ ] `is_active` is `true` by default
- [ ] `last_seen_at` has timestamps
- [ ] `environment` is set (default 'prod')

---

## Code Deployment Checklist

### Step 3: Deploy Backend Code

#### Next.js Web App
- [ ] Build Next.js app: `npm run build` (in `apps/web`)
- [ ] No TypeScript errors
- [ ] No build errors
- [ ] Deploy to production (Vercel/your hosting)
- [ ] Verify deployment successful
- [ ] Check deployment logs for errors

#### Go Notification Server
- [ ] Build Go server: `go build` (in `apps/notifications-server`)
- [ ] No compilation errors
- [ ] Deploy binary to server
- [ ] Restart Go server service
  ```bash
  # Example systemd
  sudo systemctl restart notifications-server
  ```
- [ ] Check server starts without errors
- [ ] Verify server logs show "🚀 Server started"

### Step 4: Verify Deployment

#### API Endpoint Tests
```bash
# Test 1: GET device tokens (should work immediately)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.com/api/user/device-token
```
- [ ] Returns 200 status
- [ ] Response structure matches new format
- [ ] Contains `devices` object with `ios` and `android` arrays

```bash
# Test 2: POST register token
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"TEST_TOKEN_123","platform":"ios","environment":"prod"}' \
  https://your-app.com/api/user/device-token
```
- [ ] Returns 200 status
- [ ] Response contains `success: true`
- [ ] Response includes device ID

```bash
# Test 3: Verify token in database
psql $DATABASE_URL -c "SELECT * FROM push_devices WHERE token = 'TEST_TOKEN_123';"
```
- [ ] Token found in database
- [ ] `user_id` is set correctly
- [ ] `platform` is 'ios'
- [ ] `environment` is 'prod'
- [ ] `is_active` is true

---

## Functional Testing Checklist

### Step 5: End-to-End Testing (Estimated: 15-30 minutes)

#### Test Case 1: New Device Registration
- [ ] Open mobile app (not logged in)
- [ ] Log in with test account
- [ ] Verify device token registration log in app
- [ ] Check database: token in `push_devices` table
- [ ] `user_id` matches logged-in user

#### Test Case 2: Push Notification Send
- [ ] Trigger a push notification (create patient note, etc.)
- [ ] Notification appears on mobile device
- [ ] Check Go server logs: successful send
- [ ] No errors in logs

#### Test Case 3: Multiple Devices
- [ ] Log in on second device (simulator/second phone)
- [ ] Both devices in `push_devices` table
- [ ] Send notification
- [ ] Both devices receive notification

#### Test Case 4: Device Reassignment
- [ ] Log out of Account A on Device X
- [ ] Check database: Device X marked `is_active = false`
- [ ] Log into Account B on same Device X
- [ ] Check database: Device X now has `user_id` of Account B
- [ ] Send notification to Account B → arrives on Device X ✅
- [ ] Send notification to Account A → does NOT arrive on Device X ✅

#### Test Case 5: Invalid Token Handling
- [ ] Insert fake/invalid token in database
- [ ] Send notification to that user
- [ ] Check Go server logs: error detected
- [ ] Check database: fake token marked `is_active = false`
- [ ] No further send attempts to that token

#### Test Case 6: Logout
- [ ] Log out from mobile app
- [ ] Check logs: DELETE request to `/api/user/device-token`
- [ ] Check database: device marked `is_active = false`
- [ ] Send notification → not received (expected)

---

## Monitoring Checklist (First 24 Hours)

### Step 6: Monitor Production

#### Application Logs
- [ ] Monitor Next.js API logs for errors
- [ ] Check Go server logs for send failures
- [ ] Watch for unexpected errors

#### Database Monitoring
```sql
-- Check active device growth
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as new_devices
FROM push_devices
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```
- [ ] Device registration rate looks normal
- [ ] No unusual spikes or drops

```sql
-- Check inactive device rate
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE is_active = false) as inactive,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_active = false) / COUNT(*), 2) as inactive_pct
FROM push_devices;
```
- [ ] Inactive percentage is reasonable (<10% is good)

#### User Reports
- [ ] Monitor support channels for notification issues
- [ ] Check user feedback
- [ ] Address any reported problems quickly

---

## Post-Deployment Checklist (First Week)

### Step 7: Validate System Health

#### Daily Checks (Days 1-7)
- [ ] **Day 1**: Review all logs, check error rates
- [ ] **Day 2**: Verify device count growth is normal
- [ ] **Day 3**: Check for any stale/inactive devices
- [ ] **Day 4**: Monitor notification delivery rate
- [ ] **Day 5**: Review any user-reported issues
- [ ] **Day 6**: Run maintenance queries (see below)
- [ ] **Day 7**: Full system health check

#### Week 1 Maintenance Query
```sql
-- Comprehensive health check
SELECT
  'Total Devices' as metric,
  COUNT(*)::TEXT as value
FROM push_devices
UNION ALL
SELECT
  'Active Devices',
  COUNT(*)::TEXT
FROM push_devices WHERE is_active = true
UNION ALL
SELECT
  'iOS Devices',
  COUNT(*)::TEXT
FROM push_devices WHERE platform = 'ios' AND is_active = true
UNION ALL
SELECT
  'Android Devices',
  COUNT(*)::TEXT
FROM push_devices WHERE platform = 'android' AND is_active = true
UNION ALL
SELECT
  'Avg Devices/User',
  ROUND(AVG(device_count), 2)::TEXT
FROM (
  SELECT user_id, COUNT(*) as device_count
  FROM push_devices WHERE is_active = true
  GROUP BY user_id
) user_devices;
```
- [ ] All metrics look reasonable
- [ ] No unexpected values

---

## Cleanup Checklist (After 2 Weeks)

### Step 8: Optional - Remove Old Columns

**⚠️ ONLY proceed if:**
- [ ] Push notifications working perfectly for 2+ weeks
- [ ] Zero reported issues
- [ ] All testing scenarios passed
- [ ] Team consensus to proceed

**If all above checked, run cleanup:**
```bash
psql $DATABASE_URL -f apps/web/db/migrations/2026_01_11_03_cleanup_old_device_tokens.sql
```

**Then manually edit the file and uncomment:**
```sql
ALTER TABLE "public"."user_settings" DROP COLUMN IF EXISTS "ios_device_token";
ALTER TABLE "public"."user_settings" DROP COLUMN IF EXISTS "android_device_token";
```

**Run again:**
```bash
psql $DATABASE_URL -f apps/web/db/migrations/2026_01_11_03_cleanup_old_device_tokens.sql
```

- [ ] Cleanup migration executed
- [ ] Old columns dropped
- [ ] Application still works
- [ ] No errors in logs

---

## Rollback Checklist (If Needed)

### Emergency Rollback Procedure

**If critical issues arise:**

1. **Rollback Application Code**
   - [ ] Revert Next.js deployment to previous version
   - [ ] Revert Go server to previous version
   - [ ] Verify old code is running

2. **Restore Old Array Data** (if cleanup ran)
   ```sql
   -- Rebuild ios_device_token array
   UPDATE user_settings us
   SET ios_device_token = (
     SELECT ARRAY_AGG(token)
     FROM push_devices
     WHERE user_id = us.user_id
       AND platform = 'ios'
       AND is_active = true
   );

   -- Rebuild android_device_token array
   UPDATE user_settings us
   SET android_device_token = (
     SELECT ARRAY_AGG(token)
     FROM push_devices
     WHERE user_id = us.user_id
       AND platform = 'android'
       AND is_active = true
   );
   ```
   - [ ] Arrays restored
   - [ ] Verify token counts match

3. **Verify Rollback**
   - [ ] Push notifications working with old system
   - [ ] No errors in logs
   - [ ] Users can receive notifications

4. **Optional: Drop New Table** (if needed)
   ```sql
   DROP TABLE IF EXISTS push_devices CASCADE;
   DROP TYPE IF EXISTS device_platform;
   DROP TYPE IF EXISTS device_environment;
   ```
   - [ ] Table dropped (only if necessary)

---

## Sign-Off Checklist

### Final Verification

- [ ] All migrations completed successfully
- [ ] All code deployed to production
- [ ] All functional tests passed
- [ ] No critical errors in logs
- [ ] Push notifications working for all test users
- [ ] Monitoring in place
- [ ] Team briefed on changes
- [ ] Documentation updated

### Team Sign-Off

- [ ] **Backend Engineer**: _______________ Date: ______
- [ ] **Mobile Engineer**: _______________ Date: ______
- [ ] **DevOps/SRE**: _______________ Date: ______
- [ ] **QA/Testing**: _______________ Date: ______
- [ ] **Product Owner**: _______________ Date: ______

---

## Reference Documentation

- **Quick Start**: `PUSH_DEVICES_QUICK_START.md`
- **Full Guide**: `apps/web/db/migrations/PUSH_DEVICES_MIGRATION_GUIDE.md`
- **Implementation Summary**: `PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md`
- **Schema Definition**: `apps/web/db/schema/pushDevices.ts`
- **API Routes**: `apps/web/app/api/user/device-token/route.ts`
- **Go Server**: `apps/notifications-server/push.go`

---

## Support Contacts

- **Engineer**: Kyle Essenmacher
- **Migration Date**: 2026-01-11
- **Status**: ✅ Ready for Production

---

## Notes & Issues Log

| Date | Issue | Resolution | Status |
|------|-------|------------|--------|
|      |       |            |        |
|      |       |            |        |
|      |       |            |        |

---

**Last Updated**: 2026-01-11
**Version**: 1.0
**Deployment Status**: ⏳ Pending / 🚀 In Progress / ✅ Complete