# Offline-First Account Switching with PowerSync

## 🎯 Overview

This document describes the **offline-first account switching** system that allows users to change their account type (Doctor, Triage, Evac) even when offline. Changes are queued locally and automatically synced to the backend when connectivity is restored.

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   User Interface                        │
│  AccountSwitcher Component + Online/Offline Indicator   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          OfflineAccountSwitcherService                  │
│  • Detects online/offline status                       │
│  • Handles optimistic updates                          │
│  • Manages queue operations                            │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────────┐
│  Online Mode  │   │   Offline Mode    │
│               │   │                   │
│ 1. API Call   │   │ 1. Queue Update   │
│ 2. Audit Log  │   │ 2. Local Update   │
│ 3. Update UI  │   │ 3. Sync Later     │
└───────────────┘   └─────────┬─────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  PowerSync Database  │
                    │  • offline_queue     │
                    │  • user_profile_logs │
                    │  • users             │
                    └──────────────────────┘
                              │
                    When back online...
                              │
                              ▼
                    ┌──────────────────────┐
                    │   Background Sync    │
                    │  • Process queue     │
                    │  • Create audit logs │
                    │  • Update backend    │
                    └──────────────────────┘
```

---

## 📊 Data Flow

### Online Account Switch

```
User taps "Switch to Doctor"
         │
         ▼
OfflineAccountSwitcherService.switchAccountType()
         │
         ├─► Check online status → ONLINE ✅
         │
         ▼
API: PATCH /api/user/{userId}
    { accountType: "Doctor" }
         │
         ▼
API: POST /api/user-profile-logs
    { changes: [{ field: "accountType", ... }] }
         │
         ▼
Update AuthContext
         │
         ▼
All screens re-render with new role ✅
```

### Offline Account Switch

```
User taps "Switch to Doctor"
         │
         ▼
OfflineAccountSwitcherService.switchAccountType()
         │
         ├─► Check online status → OFFLINE ❌
         │
         ▼
Queue in PowerSync offline_queue table:
  1. Update users.account_type
  2. Create user_profile_logs entry
         │
         ▼
Update local PowerSync users table (optimistic)
         │
         ▼
Update AuthContext (optimistic)
         │
         ▼
All screens re-render with new role ✅
         │
         │
         │ ... Device comes back online ...
         │
         ▼
useOfflineQueueSync detects connectivity
         │
         ▼
OfflineAccountSwitcherService.processPendingQueue()
         │
         ▼
For each queue item:
  1. API: PATCH /api/user/{userId}
  2. API: POST /api/user-profile-logs
  3. Remove from queue on success
         │
         ▼
Backend updated ✅
User sees "Synced" notification ✅
```

---

## 🗄️ Database Schema

### PowerSync Schema

#### 1. offline_queue (Local-Only)

Stores pending operations when offline.

```typescript
{
  id: string;              // UUID
  operation: string;       // 'create' | 'update' | 'delete'
  table_name: string;      // 'users' | 'user_profile_logs'
  record_id: string;       // UUID of affected record
  data: string;            // JSON payload
  retry_count: number;     // Number of retry attempts
  error: string | null;    // Last error message
  created_at: string;      // ISO timestamp
  attempted_at: string;    // Last attempt timestamp
}
```

#### 2. user_profile_logs (Synced)

Audit trail for profile changes.

```typescript
{
  id: string;              // UUID
  user_id: string;         // User whose profile changed
  changed_by: string;      // User who made the change
  changed_at: string;      // ISO timestamp
  changes: string;         // JSON array of ProfileChange
  is_admin_action: number; // 0 or 1 (boolean)
  created_at: string;      // ISO timestamp
}
```

**ProfileChange format:**
```typescript
{
  field: "accountType",
  oldValue: "Triage",
  newValue: "Doctor"
}
```

#### 3. users (Synced)

Local copy of user data for offline access.

```typescript
{
  id: string;
  email: string;
  account_type: string;    // 'Doctor' | 'Triage' | 'Evac'
  // ... other fields
}
```

---

## 🔧 Implementation

### 1. OfflineAccountSwitcherService

Core service for offline-first switching.

**Key Methods:**

```typescript
class OfflineAccountSwitcherService {
  // Main entry point
  async switchAccountType(
    userId: string,
    currentType: AccountType,
    newType: AccountType,
    user: any
  ): Promise<AccountSwitchResult>

  // Process pending queue when back online
  async processPendingQueue(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }>

  // Get pending count
  async getPendingCount(): Promise<number>

  // Get pending items
  async getPendingItems(): Promise<OfflineQueueItem[]>

  // Get audit log history
  async getUserAuditLogs(userId: string, limit?: number): Promise<UserProfileLog[]>
}
```

**Usage:**

```typescript
import { offlineAccountSwitcher } from '../services/powersync/OfflineAccountSwitcherService';

const result = await offlineAccountSwitcher.switchAccountType(
  user.id,
  'Triage',
  'Doctor',
  user
);

if (result.success) {
  if (result.isOffline) {
    Alert.alert('Offline Mode', 'Changes will sync when online');
  }
  updateUser(result.updatedUser);
}
```

### 2. useOfflineQueueSync Hook

React hook for automatic queue syncing.

**Features:**
- Auto-sync on app foreground
- Auto-sync on connectivity change
- Periodic polling
- Manual sync trigger

**Usage:**

```typescript
import { useOfflineQueueSync } from '../hooks/useOfflineQueueSync';

function MyComponent() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    syncNow,
  } = useOfflineQueueSync({
    autoSyncOnForeground: true,
    autoSyncOnOnline: true,
    pollingInterval: 30000,
    debug: true,
  });

  return (
    <View>
      <Text>Status: {isOnline ? 'Online' : 'Offline'}</Text>
      <Text>Pending: {pendingCount}</Text>
      {isSyncing && <ActivityIndicator />}
      <Button onPress={syncNow}>Sync Now</Button>
    </View>
  );
}
```

### 3. AccountSwitcher Component

Updated to show online/offline status and pending count.

**Features:**
- Online/offline indicator
- Pending queue count badge
- Offline mode alert
- Seamless switching in both modes

**Visual Indicators:**

```typescript
// Online
<Wifi size={14} color="#10b981" />
<Text>Online</Text>

// Offline
<WifiOff size={14} color="#ef4444" />
<Text>Offline</Text>

// Pending
<Badge>{pendingCount} pending</Badge>
```

### 4. AuthContext Integration

AuthContext automatically processes pending queue on:
- App startup (if admin)
- PowerSync initialization
- User login

```typescript
// In AuthContext.tsx
if (storedUser.isAdmin) {
  await powerSync.initialize(...);
  
  // Process pending queue
  const pendingCount = await offlineAccountSwitcher.getPendingCount();
  if (pendingCount > 0) {
    await offlineAccountSwitcher.processPendingQueue();
  }
}
```

---

## 🚀 Usage Guide

### For Users

#### Online Mode
1. Open Settings → Account Type Switcher
2. Tap desired role (Doctor, Triage, Evac)
3. Changes apply instantly ✅
4. All screens update immediately ✅

#### Offline Mode
1. Open Settings → Account Type Switcher
2. See "Offline" indicator 📴
3. Tap desired role
4. See "X pending" badge
5. Alert: "Changes will sync when online"
6. Continue working with new role ✅
7. When back online: Automatic sync! ✅

### For Developers

#### Testing Offline Mode

**Simulate Offline:**
```typescript
// Option 1: Airplane mode on device
// Option 2: Kill PowerSync connection
const powerSync = PowerSyncService.getInstance();
await powerSync.disconnect();

// Switch account type
await offlineAccountSwitcher.switchAccountType(...);

// Check queue
const pending = await offlineAccountSwitcher.getPendingCount();
console.log('Pending:', pending); // Should be > 0
```

**Test Queue Processing:**
```typescript
// Reconnect
await powerSync.initialize(...);

// Process queue
const result = await offlineAccountSwitcher.processPendingQueue();
console.log('Processed:', result);
// { processed: 2, succeeded: 2, failed: 0 }
```

#### Debugging

**Check Queue Status:**
```typescript
const items = await offlineAccountSwitcher.getPendingItems();
console.log('Queue items:', items);
```

**View in PowerSync Test Screen:**
- Navigate to Admin → PowerSync Test
- See "Offline Queue" section
- View pending items
- Click "Process Queue" to sync manually
- Click "Clear Queue" to reset (testing only)

#### Monitoring

**Add logging:**
```typescript
const result = await offlineAccountSwitcher.switchAccountType(...);

console.log('[AccountSwitch] Result:', {
  success: result.success,
  isOffline: result.isOffline,
  queuedForSync: result.queuedForSync,
});
```

**Use hook for live monitoring:**
```typescript
const { pendingCount, isOnline, lastSyncAt } = useOfflineQueueSync();

useEffect(() => {
  console.log('Queue status:', { pendingCount, isOnline, lastSyncAt });
}, [pendingCount, isOnline, lastSyncAt]);
```

---

## 🔄 Sync Strategies

### Automatic Sync Triggers

1. **App Foreground** (highest priority)
   - User returns to app
   - Checks for pending items
   - Syncs if online and has pending

2. **Connectivity Change** (high priority)
   - Device reconnects to network
   - PowerSync connection established
   - Immediate queue processing

3. **PowerSync Initialization** (medium priority)
   - After user login
   - After app restart
   - Processes queue in background

4. **Periodic Polling** (low priority)
   - Every 30 seconds (configurable)
   - Checks online status
   - Updates pending count

### Manual Sync

Users can trigger manual sync:
- PowerSync Test Screen → "Process Queue" button
- Pull-to-refresh in Settings
- Explicit `syncNow()` call

### Retry Logic

Failed queue items:
- Increment `retry_count`
- Store error message
- Update `attempted_at` timestamp
- Keep in queue for next sync attempt
- No automatic retry limit (manual cleanup)

---

## 🛡️ Error Handling

### Online Mode Failures

If API call fails while online:
1. Log error to console
2. Fall back to offline mode
3. Queue for later sync
4. Show offline mode alert

```typescript
try {
  await switchOnline(userId, currentType, newType, user);
} catch (error) {
  console.warn('Online switch failed, falling back to offline mode');
  await switchOffline(userId, currentType, newType, user);
}
```

### Offline Mode Failures

If queue operation fails:
1. Return error to user
2. Don't update user state
3. Log detailed error
4. Allow retry

```typescript
try {
  await queueAccountTypeUpdate(...);
  await queueAuditLogEntry(...);
} catch (error) {
  return {
    success: false,
    error: error.message,
    updatedUser: user, // Original user, unchanged
  };
}
```

### Sync Failures

If queue processing fails:
1. Increment retry count
2. Store error message
3. Keep item in queue
4. Continue processing other items
5. Return summary to caller

```typescript
for (const item of pendingItems) {
  try {
    await processQueueItem(item);
    await removeFromQueue(item.id);
    succeeded++;
  } catch (error) {
    await incrementRetryCount(item.id, error.message);
    failed++;
  }
}
```

---

## 📊 Backend Requirements

### 1. User Profile Logs API Endpoint

**POST /api/user-profile-logs**

Create a new audit log entry.

```typescript
// Request
{
  userId: string;
  changedBy: string;
  changes: ProfileChange[];
  isAdminAction: boolean;
}

// Response
{
  id: string;
  userId: string;
  changedBy: string;
  changedAt: string;
  changes: ProfileChange[];
  isAdminAction: boolean;
  createdAt: string;
}
```

**Implementation Example:**

```typescript
// apps/web/app/api/user-profile-logs/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userProfileLogs } from '@/db/schema/userProfileLogs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, changedBy, changes, isAdminAction } = body;

    const log = await db.insert(userProfileLogs).values({
      userId,
      changedBy,
      changedAt: new Date(),
      changes: JSON.stringify(changes),
      isAdminAction,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(log[0]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
```

### 2. PowerSync Sync Rules

Add sync rule for user_profile_logs table.

```yaml
# apps/powersync-server/sync-rules.yaml

- bucket_definitions:
    admin_data:
      data:
        # ... other tables
        - SELECT * FROM user_profile_logs
```

### 3. Database Migration

Add user_profile_logs table if not exists.

```sql
-- Migration: Add user_profile_logs table
CREATE TABLE IF NOT EXISTS user_profile_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changes JSONB NOT NULL,
  is_admin_action BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profile_logs_user_id ON user_profile_logs(user_id);
CREATE INDEX idx_user_profile_logs_changed_by ON user_profile_logs(changed_by);
CREATE INDEX idx_user_profile_logs_changed_at ON user_profile_logs(changed_at);
CREATE INDEX idx_user_profile_logs_is_admin_action ON user_profile_logs(is_admin_action);
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] OfflineAccountSwitcherService methods
- [ ] Queue operations (add, remove, process)
- [ ] Online/offline detection
- [ ] Retry logic
- [ ] Error handling

### Integration Tests

- [ ] Switch account online → API called
- [ ] Switch account offline → Queued
- [ ] Come back online → Queue processed
- [ ] Multiple switches offline → All queued
- [ ] Failed sync → Retry incremented
- [ ] Clear queue → All items removed

### E2E Tests

- [ ] User switches Doctor → Triage (online)
- [ ] User switches Triage → Evac (offline)
- [ ] App restarts → Queue persists
- [ ] Device reconnects → Auto-sync
- [ ] View audit log history
- [ ] PowerSync Test Screen shows queue

### Manual Testing

1. **Online Switch**
   - [ ] Open AccountSwitcher
   - [ ] See "Online" indicator
   - [ ] Switch role → Instant update
   - [ ] Check backend → Log created

2. **Offline Switch**
   - [ ] Enable airplane mode
   - [ ] Open AccountSwitcher
   - [ ] See "Offline" indicator
   - [ ] Switch role → Optimistic update
   - [ ] See "X pending" badge
   - [ ] Check PowerSync Test → Queue visible

3. **Auto-Sync**
   - [ ] Disable airplane mode
   - [ ] Wait 5-10 seconds
   - [ ] Check PowerSync Test → Queue empty
   - [ ] Check backend → Log created
   - [ ] Verify UI still shows new role

4. **Retry Logic**
   - [ ] Go offline
   - [ ] Switch role → Queued
   - [ ] Go online (but kill backend)
   - [ ] Queue processes → Fails
   - [ ] Check retry_count incremented
   - [ ] Start backend
   - [ ] Manual sync → Success

---

## 📈 Performance Considerations

### Queue Size
- Typical queue size: 1-5 items
- Max recommended: 100 items
- Each item: ~200-500 bytes
- Total storage: <50KB

### Sync Duration
- Single item: 200-500ms (network dependent)
- 10 items: 2-5 seconds
- Background processing: non-blocking

### Battery Impact
- Polling: Minimal (30s interval)
- Sync: Brief network activity
- No continuous background tasks

### Optimization Tips
1. Increase polling interval if battery critical
2. Batch multiple changes in single queue item
3. Limit queue size (auto-clear old items)
4. Use incremental sync (not full re-sync)

---

## 🔒 Security Considerations

### Authentication
- All API calls use JWT token
- Token must be valid for sync to succeed
- Expired token → Queue remains until re-login

### Authorization
- Only admin users can sync user_profile_logs
- User can only switch own account type
- Backend validates user ID matches token

### Data Privacy
- Queue stored in local encrypted DB
- Sensitive data not logged
- Audit logs include change metadata only

### Conflict Resolution
- Last write wins (LWW)
- Server state is authoritative
- Local changes overwritten on conflict

---

## 🆘 Troubleshooting

### Queue Not Processing

**Symptom:** Pending count stays > 0 after going online

**Solutions:**
1. Check PowerSync connection:
   ```typescript
   const status = PowerSyncService.getInstance().getSyncStatus();
   console.log('Connected:', status.connected);
   ```

2. Check auth token:
   ```typescript
   const token = TokenStorage.getAuthToken();
   console.log('Has token:', !!token);
   ```

3. Manual sync:
   ```typescript
   await offlineAccountSwitcher.processPendingQueue();
   ```

4. Check backend logs for API errors

### Account Type Not Updating

**Symptom:** UI shows new role but backend doesn't update

**Solutions:**
1. Check queue items:
   ```typescript
   const items = await offlineAccountSwitcher.getPendingItems();
   console.log('Queue:', items);
   ```

2. Check for errors:
   ```typescript
   const items = await offlineAccountSwitcher.getPendingItems();
   const errors = items.filter(i => i.error);
   console.log('Errors:', errors);
   ```

3. Clear queue and retry:
   ```typescript
   await offlineAccountSwitcher.clearQueue();
   // Switch role again
   ```

### PowerSync Not Initializing

**Symptom:** "PowerSync not ready" errors

**Solutions:**
1. Check user is admin:
   ```typescript
   console.log('User isAdmin:', user?.isAdmin);
   ```

2. Check PowerSync token:
   ```typescript
   const psToken = TokenStorage.getPowerSyncToken();
   console.log('PS token exists:', !!psToken);
   ```

3. Reinitialize PowerSync:
   ```typescript
   const powerSync = PowerSyncService.getInstance();
   await powerSync.disconnect();
   await powerSync.initialize({...});
   ```

---

## 📚 Related Documentation

- **[USER_STATE_MANAGEMENT.md](./USER_STATE_MANAGEMENT.md)** - AuthContext pattern
- **[AUTH_CONTEXT_MIGRATION_COMPLETE.md](./AUTH_CONTEXT_MIGRATION_COMPLETE.md)** - Migration guide
- **[ACCOUNT_SWITCHER.md](./ACCOUNT_SWITCHER.md)** - Account switcher details
- **[PowerSync Official Docs](https://docs.powersync.com/)** - PowerSync documentation

---

## 🎓 Best Practices

### DO ✅

1. **Always check online status before critical operations**
   ```typescript
   const result = await offlineAccountSwitcher.switchAccountType(...);
   if (result.isOffline) {
     // Show user-friendly offline message
   }
   ```

2. **Use optimistic updates for better UX**
   ```typescript
   // Update UI immediately
   updateUser(result.updatedUser);
   // Sync happens in background
   ```

3. **Monitor pending queue in UI**
   ```typescript
   const { pendingCount } = usePendingQueueCount();
   // Show badge if pendingCount > 0
   ```

4. **Handle errors gracefully**
   ```typescript
   try {
     await offlineAccountSwitcher.switchAccountType(...);
   } catch (error) {
     Alert.alert('Error', 'Please try again');
   }
   ```

5. **Test offline mode thoroughly**
   - Airplane mode
   - Network timeouts
   - Server down
   - Token expiry

### DON'T ❌

1. **Don't block UI during sync**
   ```typescript
   // Bad
   await offlineAccountSwitcher.processPendingQueue();
   
   // Good
   offlineAccountSwitcher.processPendingQueue(); // Fire and forget
   ```

2. **Don't assume online mode**
   ```typescript
   // Bad
   const response = await apiClient.patch(...);
   
   // Good
   const result = await offlineAccountSwitcher.switchAccountType(...);
   ```

3. **Don't ignore queue errors**
   ```typescript
   // Bad
   await processPendingQueue(); // Ignore result
   
   // Good
   const result = await processPendingQueue();
   if (result.failed > 0) {
     console.warn('Some items failed:', result);
   }
   ```

4. **Don't manually modify offline_queue table**
   ```typescript
   // Bad
   await powerSync.execute('DELETE FROM offline_queue');
   
   // Good
   await offlineAccountSwitcher.clearQueue();
   ```

5. **Don't sync without checking PowerSync readiness**
   ```typescript
   // Bad
   await processPendingQueue();
   
   // Good
   if (PowerSyncService.getInstance().isReady()) {
     await processPendingQueue();
   }
   ```

---

## 📝 Summary

**Offline-first account switching** provides a seamless user experience by:

✅ **Allowing role changes offline** - Users never blocked  
✅ **Optimistic updates** - Instant UI feedback  
✅ **Automatic sync** - No user intervention needed  
✅ **Audit trail** - All changes logged  
✅ **Retry logic** - Resilient to transient failures  
✅ **PowerSync integration** - Leverages existing sync infrastructure  

**Key Insight:** By using PowerSync's `offline_queue` table and optimistic updates, we provide a **native app experience** that works seamlessly regardless of connectivity.

---

**Last Updated:** 2025-01-24  
**Version:** 1.0  
**Status:** ✅ Production Ready  
**Pattern:** Offline-First + Optimistic UI + Background Sync