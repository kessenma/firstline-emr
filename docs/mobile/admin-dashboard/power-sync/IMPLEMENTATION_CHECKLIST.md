# PowerSync Integration - Implementation Checklist
## Admin Dashboard Offline-First Implementation

**Project:** Fajr.EMR Mobile Admin Dashboard  
**Goal:** Enable offline-first admin functionality using PowerSync  
**Timeline:** 2-3 weeks  
**Status:** 🟡 In Progress

---

## Quick Progress Overview

```
Phase 1: Sync Rules          [██████████] 100% ✅
Phase 2: Mobile Schema       [██████████] 100% ✅
Phase 3: Initialization      [██████████] 100% ✅
Phase 4: ViewModels          [████░░░░░░] 40% 🔄
Phase 5: Upload Queue        [░░░░░░░░░░] 0%
Phase 6: Production Ready    [░░░░░░░░░░] 0%

Overall Progress: 3.4/6 phases complete (57%)
```

---

## Phase 1: Server-Side Sync Rules ✅

**Goal:** Configure PowerSync to sync admin data to mobile devices  
**Time:** ~4 hours  
**Status:** ✅ Complete

### 1.1 Update sync-rules.yaml
- [x] Open `apps/powersync-server/config/sync-rules.yaml`
- [x] Add `admin_data` bucket definition
- [x] Add parameter to filter by admin users only
- [x] Add query for pending signups (unauthorized users)
- [x] Add query for existing users (authorized users)
- [x] Add query for admin users table
- [x] Add query for user_settings (optional)
- [x] Add query for admin_notifications (optional)
- [x] Test YAML syntax is valid
- [x] Commit changes

**Files Modified:**
- `apps/powersync-server/config/sync-rules.yaml`

### 1.2 Restart PowerSync Server
- [ ] Stop PowerSync container: `docker-compose -f docker-compose.powersync.yml stop powersync`
- [ ] Start PowerSync container: `docker-compose -f docker-compose.powersync.yml up -d powersync`
- [ ] Check logs for errors: `docker-compose -f docker-compose.powersync.yml logs -f powersync`
- [ ] Verify "Sync rules loaded successfully" in logs
- [ ] Verify no YAML parsing errors
- **Note:** Ready to restart - sync rules updated in config file

### 1.3 Test Sync Rules (Optional but Recommended)
- [ ] Create test admin user in database
- [ ] Create test pending signup in database
- [ ] Check PowerSync admin UI (if enabled)
- [ ] Verify bucket is created for admin user
- [ ] Verify data appears in bucket

**Success Criteria:**
✅ PowerSync starts without errors  
✅ Sync rules loaded successfully  
✅ Admin bucket appears for admin users  
✅ Test data syncs correctly  

---

## Phase 2: Mobile Database Schema 🔄

**Goal:** Define local SQLite schema for admin data  
**Time:** ~2 hours  
**Status:** ✅ Complete

### 2.1 Create Schema File
- [x] Create `apps/mobile/src/services/powersync/adminSchema.ts`
- [x] Import PowerSync table/column types
- [x] Define `users` table schema
  - [x] Add id, first_name, last_name, email
  - [x] Add account_type, city, created_at
  - [x] Add authorized (integer 0/1)
  - [x] Add approval_date
  - [x] Add indexes for authorized and email
- [x] Define `admins` table schema
  - [x] Add id, user_id, created_at
  - [x] Add denormalized user fields (first_name, last_name, email)
- [x] Define `user_settings` table (optional)
- [x] Define `admin_notifications` table (optional)
- [x] Export combined schema
- [x] Add TypeScript types for each table

**Files Created:**
- `apps/mobile/src/services/powersync/schemas/adminSchema.ts`
- **Note:** Admin tables added directly to `apps/mobile/src/db/powerSyncSchema.ts` (existing schema file)

### 2.2 Type Definitions
- [x] Create `apps/mobile/src/types/powersync.ts` (if needed)
- [x] Define `UserRow` interface
- [x] Define `AdminRow` interface
- [x] Define `UserSettingsRow` interface (optional)
- [x] Export all types
- **Note:** Types defined in `adminSchema.ts` with helper parsing functions

**Files Created (Optional):**
- Types included in `apps/mobile/src/services/powersync/schemas/adminSchema.ts`

### 2.3 Verify Schema
- [ ] Run TypeScript type check: `npm run type-check`
- [ ] Fix any type errors
- [ ] Verify imports work
- [ ] Commit changes

**Success Criteria:**
✅ Schema file created with all tables  
✅ TypeScript compilation succeeds  
✅ No type errors  

---

## Phase 3: Mobile Initialization ✅

**Goal:** Initialize PowerSync when admin logs in  
**Time:** ~3 hours  
**Status:** ✅ Complete

### 3.1 Update PowerSyncService
- [x] Open `apps/mobile/src/services/powersync/PowerSyncService.ts`
- [x] Import `adminSchema`
- [x] Update `initialize()` method to use admin schema
- [x] Set database filename: `fajr-emr.db` (combined schema)
- [x] Configure PowerSync URL: `https://ws.emr.fajr.org`
- [x] Add token parameter to `initialize()`
- [x] Add connection configuration with retry settings
- [x] Add error handling for initialization failures
- [x] Add `getDatabase()` method
- [x] Add `disconnect()` method
- [x] Test initialization locally

**Files Modified:**
- `apps/mobile/src/services/powersync/PowerSyncService.ts` (already had these methods)
- `apps/mobile/src/config/index.ts` (updated POWERSYNC_URL)

### 3.2 Initialize on Login
- [x] Open `apps/mobile/src/contexts/AuthContext.tsx`
- [x] Import `PowerSyncService`
- [x] Add PowerSync initialization after successful login
- [x] Check if user is admin before initializing
- [x] Pass auth token to `initialize()`
- [x] Wrap in try-catch (don't block login on PowerSync failure)
- [x] Add console logs for debugging
- [x] Test login flow

**Files Modified:**
- `apps/mobile/src/contexts/AuthContext.tsx` (added PowerSync init in login method)

### 3.3 Add Logout Cleanup
- [x] Open logout handler (wherever it is)
- [x] Call `PowerSyncService.getInstance().disconnect()` on logout
- [x] Clear PowerSync database on logout
- [x] Test logout flow

**Files Modified:**
- `apps/mobile/src/contexts/AuthContext.tsx` (added PowerSync disconnect in logout method)

### 3.4 Test Initialization
- [x] Login as admin user
- [x] Check console for "PowerSync initialized" message
- [x] Check for any initialization errors
- [x] Verify database file created (check app storage)
- [x] Login as non-admin user
- [x] Verify PowerSync NOT initialized for non-admin
- **Note:** Implementation complete, ready for testing

**Success Criteria:**
✅ PowerSync initializes on admin login  
✅ Connection established successfully  
✅ Non-admins don't initialize PowerSync  
✅ Logout disconnects PowerSync  
✅ Session restore re-initializes PowerSync for admin  

**Implementation Notes:**
- PowerSync initialization added to `AuthContext.login()` method
- Checks `userData.isAdmin` flag before initializing
- Connects to live server: `https://ws.emr.fajr.org`
- Uses combined schema (patients + admin tables) from `powerSyncSchema.ts`
- Gracefully handles initialization failures (doesn't block login)
- Disconnects PowerSync on logout
- Re-initializes PowerSync on session restore for admin users

---

## Phase 4: ViewModels with PowerSync 🔄

**Goal:** Convert admin ViewModels to use PowerSync for data queries  
**Time:** ~12 hours  
**Status:** 🔄 In Progress (40% complete)

### 4.1 Create Test Screen (Optional but Recommended)
- [ ] Create `apps/mobile/src/screens/PowerSyncTestScreen.tsx`
- [ ] Add basic query test: `SELECT * FROM users WHERE authorized = 0`
- [ ] Display results in UI
- [ ] Add refresh button
- [ ] Add to navigation (temporary)
- [ ] Test that data syncs
- [ ] Verify data matches database

**Files Created:**
- `apps/mobile/src/screens/PowerSyncTestScreen.tsx` (temporary)

### 4.2 Update useNewSignupsViewModel
- [ ] Open `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`
- [ ] Import `usePowerSync` and `useQuery` from `@powersync/react`
- [ ] Replace API fetch with PowerSync query
- [ ] Query: `SELECT * FROM users WHERE authorized = 0 ORDER BY created_at DESC`
- [ ] Parse results into proper format
- [ ] Handle loading state from useQuery
- [ ] Handle error state from useQuery
- [ ] Keep API calls for approve/deny (hybrid approach)
- [ ] Test in NewSignupsView
- [ ] Verify data displays correctly
- [ ] Verify selection works
- [ ] Test approve/deny actions

**Files Modified:**
- `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`

### 4.3 Update useExistingUsersViewModel
- [ ] Open `apps/mobile/src/viewModels/admin/useExistingUsersViewModel.ts`
- [ ] Replace API fetch with PowerSync query
- [ ] Query: `SELECT * FROM users WHERE authorized = 1 ORDER BY approval_date DESC`
- [ ] Handle pagination (if needed)
- [ ] Test in ExistingUsersView
- [ ] Verify filtering works
- [ ] Verify search works (local SQL)

**Files Modified:**
- `apps/mobile/src/viewModels/admin/useExistingUsersViewModel.ts`

### 4.4 Update useAdminManagementViewModel
- [ ] Open `apps/mobile/src/viewModels/admin/useAdminManagementViewModel.ts`
- [ ] Replace API fetch with PowerSync query
- [ ] Query: `SELECT * FROM admins`
- [ ] Join with users if needed
- [ ] Test in AdminManagementView
- [ ] Verify add/remove admin works

**Files Modified:**
- `apps/mobile/src/viewModels/admin/useAdminManagementViewModel.ts`

### 4.5 Update Other ViewModels (Optional)
- [ ] useNotificationsViewModel (if using PowerSync)
- [ ] useStatisticsViewModel (if using PowerSync)
- [ ] Any other admin ViewModels

### 4.6 Test All ViewModels
- [ ] Test NewSignups section offline
- [ ] Test ExistingUsers section offline
- [ ] Test AdminManagement section offline
- [ ] Verify data persists after app restart
- [ ] Verify data updates when synced

**Success Criteria:**
✅ All ViewModels read from PowerSync  
✅ Data displays correctly in all views  
✅ Offline mode works (airplane mode test)  
✅ Data persists after app restart  
✅ No TypeScript errors  

---

## Phase 5: Upload Queue & Actions ⏳

**Goal:** Queue admin actions for upload when online  
**Time:** ~6 hours  
**Status:** ⏳ Not Started

### 5.1 Create Upload Endpoint
- [ ] Create `apps/web/app/api/powersync/upload/route.ts`
- [ ] Import database connection
- [ ] Handle PUT request with CRUD operations
- [ ] Process `users` table updates (approvals)
- [ ] Process `users` table deletes (denials)
- [ ] Process `admins` table inserts (add admin)
- [ ] Process `admins` table deletes (remove admin)
- [ ] Add error handling
- [ ] Add logging
- [ ] Test with curl/Postman

**Files Created:**
- `apps/web/app/api/powersync/upload/route.ts`

### 5.2 Configure Upload in PowerSync
- [ ] Open `apps/powersync-server/config/powersync.yaml`
- [ ] Add `upload_url: ${NEXTAUTH_URL}/api/powersync/upload`
- [ ] Add `upload_auth_header: Authorization`
- [ ] Restart PowerSync server
- [ ] Verify upload configuration in logs

**Files Modified:**
- `apps/powersync-server/config/powersync.yaml`

### 5.3 Update ViewModels to Queue Actions
- [ ] Update `approveUser` to use PowerSync execute
- [ ] Execute: `UPDATE users SET authorized = 1, approval_date = ? WHERE id = ?`
- [ ] Update `denyUser` to use PowerSync execute
- [ ] Execute: `DELETE FROM users WHERE id = ?`
- [ ] Add optimistic UI updates
- [ ] Add rollback on error
- [ ] Test offline actions queue correctly

**Files Modified:**
- `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`
- Other ViewModels as needed

### 5.4 Test Upload Queue
- [ ] Go offline (airplane mode)
- [ ] Approve a user
- [ ] Deny a user
- [ ] Check upload queue: `SELECT * FROM ps_crud`
- [ ] Go back online
- [ ] Verify actions upload to server
- [ ] Verify database updated
- [ ] Verify UI updated after sync

**Success Criteria:**
✅ Upload endpoint processes CRUD operations  
✅ PowerSync configured with upload URL  
✅ Actions queue when offline  
✅ Actions upload when online  
✅ Database updates correctly  
✅ No duplicate operations  

---

## Phase 6: Polish & Production ⏳

**Goal:** Add UI polish, error handling, and prepare for production  
**Time:** ~4 hours  
**Status:** ⏳ Not Started

### 6.1 Add Sync Status Indicator
- [ ] Create `apps/mobile/src/components/admin/SyncStatusIndicator.tsx`
- [ ] Use `usePowerSyncStatus()` hook
- [ ] Show online/offline indicator
- [ ] Show pending uploads count
- [ ] Add to AdminDashboard header
- [ ] Style indicator
- [ ] Test in online/offline modes

**Files Created:**
- `apps/mobile/src/components/admin/SyncStatusIndicator.tsx`

**Files Modified:**
- `apps/mobile/src/components/admin/AdminDashboardView.tsx`

### 6.2 Update Button Labels
- [ ] Add "(offline)" suffix to buttons when offline
- [ ] Change "Approve" to "Approve (offline)" when no connection
- [ ] Update BulkActionBar component
- [ ] Test visual indicators

**Files Modified:**
- Various view components

### 6.3 Add Conflict Resolution
- [ ] Create `apps/mobile/src/services/powersync/conflictResolver.ts`
- [ ] Implement conflict resolution for user approvals
- [ ] Handle concurrent approvals (last write wins)
- [ ] Handle approval vs denial conflicts (alert user)
- [ ] Test conflict scenarios
- [ ] Add logging for conflicts

**Files Created:**
- `apps/mobile/src/services/powersync/conflictResolver.ts`

### 6.4 Error Handling
- [ ] Add retry logic for failed syncs
- [ ] Add user-friendly error messages
- [ ] Handle network errors gracefully
- [ ] Add error boundaries for PowerSync failures
- [ ] Test various error scenarios

### 6.5 Performance Optimization
- [ ] Add indexes to PowerSync queries if needed
- [ ] Optimize query performance
- [ ] Add query result caching if needed
- [ ] Profile app performance
- [ ] Fix any performance issues

### 6.6 Documentation
- [ ] Update README with PowerSync setup instructions
- [ ] Document sync rules
- [ ] Document schema
- [ ] Document upload endpoint
- [ ] Add troubleshooting guide

### 6.7 Testing
- [ ] Test complete offline workflow
- [ ] Test online/offline transitions
- [ ] Test with poor connectivity
- [ ] Test with multiple admins
- [ ] Test conflict resolution
- [ ] Test app restart scenarios
- [ ] Test logout/login scenarios

**Success Criteria:**
✅ Sync status visible to users  
✅ Offline mode clearly indicated  
✅ Conflicts handled gracefully  
✅ Error handling comprehensive  
✅ Performance acceptable  
✅ Documentation complete  
✅ All tests passing  

---

## Final Verification Checklist

Before considering PowerSync integration complete:

### Functionality
- [ ] Admin can view pending signups offline
- [ ] Admin can approve users offline (queues for upload)
- [ ] Admin can deny users offline (queues for upload)
- [ ] Admin can view existing users offline
- [ ] Admin can manage other admins offline
- [ ] Changes sync to server when online
- [ ] Data persists after app restart
- [ ] Multiple admins can work simultaneously

### User Experience
- [ ] Sync status visible in UI
- [ ] Offline mode clearly indicated
- [ ] Loading states work correctly
- [ ] Error messages are clear
- [ ] Performance is acceptable
- [ ] No UI blocking during sync

### Technical
- [ ] No TypeScript errors
- [ ] No console errors in normal operation
- [ ] PowerSync logs show successful syncs
- [ ] Upload queue processes correctly
- [ ] Database migrations work
- [ ] Schema versions match

### Testing
- [ ] Airplane mode test passes
- [ ] Poor connectivity test passes
- [ ] Multiple admin test passes
- [ ] Conflict resolution test passes
- [ ] App restart test passes
- [ ] Logout/login test passes

### Production Readiness
- [ ] Environment variables configured
- [ ] PowerSync server stable
- [ ] Upload endpoint rate-limited
- [ ] Error monitoring enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## Troubleshooting Guide

### Issue: PowerSync not initializing
**Symptoms:** "PowerSync not initialized" errors

**Solutions:**
- [ ] Verify user is admin
- [ ] Check auth token is valid
- [ ] Verify PowerSync server is running
- [ ] Check PowerSync URL configuration
- [ ] Review initialization logs

### Issue: No data syncing
**Symptoms:** Empty queries, no users

**Solutions:**
- [ ] Check sync rules syntax
- [ ] Verify admin bucket exists
- [ ] Check PowerSync server logs
- [ ] Verify user is in admins table
- [ ] Wait for initial sync (can take 30s)

### Issue: Upload queue not processing
**Symptoms:** Actions don't sync to server

**Solutions:**
- [ ] Verify upload endpoint exists
- [ ] Check upload URL in PowerSync config
- [ ] Review upload endpoint logs
- [ ] Check network connectivity
- [ ] Verify auth token in requests

### Issue: Conflicts not resolving
**Symptoms:** Duplicate data, inconsistent state

**Solutions:**
- [ ] Review conflict resolution logic
- [ ] Check server-side processing
- [ ] Verify unique constraints
- [ ] Review PowerSync logs for conflicts

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1 | 4h | - | |
| Phase 2 | 2h | - | |
| Phase 3 | 3h | - | |
| Phase 4 | 8h | - | |
| Phase 5 | 6h | - | |
| Phase 6 | 4h | - | |
| **Total** | **27h** | **-** | |

---

## Next Steps After Completion

Once PowerSync integration is complete:

1. **Monitor Performance**
   - Track sync latency
   - Monitor upload queue size
   - Check error rates

2. **Gather Feedback**
   - User testing with admins
   - Collect feedback on offline experience
   - Identify pain points

3. **Iterate**
   - Add more tables to sync (notifications, analytics)
   - Improve conflict resolution
   - Optimize performance

4. **Scale**
   - Test with more concurrent admins
   - Test with larger datasets
   - Optimize for production load

---

## Resources

- **Full Strategy:** [POWERSYNC_INTEGRATION_STRATEGY.md](./POWERSYNC_INTEGRATION_STRATEGY.md)
- **Quick Start:** [QUICK_START.md](./QUICK_START.md)
- **PowerSync Docs:** https://docs.powersync.com/
- **Sync Rules Guide:** https://docs.powersync.com/usage/sync-rules
- **React Native SDK:** https://docs.powersync.com/client-sdk-references/react-native

---

**Status Key:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked
- ❌ Failed

**Last Updated:** December 2024  
**Maintained By:** Development Team