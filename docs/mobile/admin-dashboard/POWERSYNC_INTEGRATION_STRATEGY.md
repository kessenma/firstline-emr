# PowerSync Integration Strategy for Admin Dashboard
## Mobile Offline-First Admin Features

**Document Version:** 1.0  
**Created:** December 2024  
**Status:** Planning Phase  
**Priority:** HIGH - Foundation for Mobile Admin Features

---

## Executive Summary

This document outlines the strategy for integrating PowerSync with the mobile admin dashboard to enable **offline-first admin functionality**. You've already set up PowerSync for the web app and have the infrastructure running. Now we need to leverage it for the mobile admin features.

### Current State
✅ PowerSync server running (`docker-compose.powersync.yml`)  
✅ Sync rules configured for patients + notes  
✅ Web app PowerSync views working  
✅ Mobile app has PowerSync service skeleton  
❌ **No admin data synced yet**  
❌ **Admin dashboard views not connected to PowerSync**  

### Goal State
🎯 Admin data (users, signups, etc.) synced offline  
🎯 Admin can review/approve users without internet  
🎯 Changes queue and sync when online  
🎯 Conflict resolution for multi-admin scenarios  

---

## Why PowerSync for Admin Dashboard?

### The Problem
Your current mobile admin implementation uses **Next.js API endpoints** which require:
- ❌ Active internet connection
- ❌ Round-trip to server for every action
- ❌ Can't work in areas with poor connectivity
- ❌ Slow UX (network latency)

### The Solution: PowerSync
- ✅ Offline-first: Data available immediately
- ✅ Fast UX: No network latency
- ✅ Works anywhere: Remote areas, planes, submarines
- ✅ Automatic sync: Changes upload when back online
- ✅ Conflict resolution: Multiple admins can work simultaneously

### Perfect Use Cases
1. **Field admins** reviewing signups in remote areas
2. **Emergency situations** where connectivity is limited
3. **International travel** with spotty connectivity
4. **Fast workflows** - no waiting for API calls

---

## Architecture Overview

### Current Setup (What You Have)

```
┌─────────────────────────────────────────────────────────┐
│                    CURRENT STATE                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Mobile App                                             │
│  ├─ LoginScreen.tsx ✅ (working with Next.js)          │
│  ├─ Admin Dashboard Views 📝 (no data yet)             │
│  └─ PowerSyncService.ts ✅ (skeleton exists)           │
│                                                         │
│  Next.js Backend                                        │
│  ├─ /api/admin/* endpoints ✅                          │
│  └─ PostgreSQL database ✅                             │
│                                                         │
│  PowerSync Server ✅                                    │
│  ├─ Running on Docker                                   │
│  ├─ Sync rules: patients + notes only                  │
│  └─ Connected to PostgreSQL                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Target Setup (What We're Building)

```
┌─────────────────────────────────────────────────────────┐
│                    TARGET STATE                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Mobile App                                             │
│  ├─ PowerSync Database (local SQLite)                  │
│  │   ├─ users (pending signups)                        │
│  │   ├─ users (existing)                               │
│  │   ├─ admins                                          │
│  │   ├─ user_settings                                   │
│  │   └─ notifications                                   │
│  │                                                      │
│  ├─ Admin ViewModels                                    │
│  │   ├─ useNewSignupsViewModel (PowerSync)            │
│  │   ├─ useExistingUsersViewModel (PowerSync)         │
│  │   └─ useAdminMgmtViewModel (PowerSync)             │
│  │                                                      │
│  ├─ Upload Queue (for actions)                         │
│  │   ├─ Approve user requests                          │
│  │   ├─ Deny user requests                             │
│  │   └─ Admin changes                                  │
│  │                                                      │
│  └─ PowerSyncService (enhanced)                        │
│      ├─ Sync admin data                                │
│      ├─ Handle conflicts                               │
│      └─ Queue admin actions                            │
│                                                         │
│  PowerSync Server (enhanced)                            │
│  ├─ New sync rules for admin data                      │
│  ├─ Admin bucket definitions                           │
│  └─ Conflict resolution rules                          │
│                                                         │
│  Next.js Backend                                        │
│  ├─ /api/admin/* (still used for uploads)             │
│  └─ PowerSync triggers (for action processing)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Extend Sync Rules for Admin Data

### 1.1 Update `sync-rules.yaml`

**File:** `apps/powersync-server/config/sync-rules.yaml`

Add admin data bucket:

```yaml
bucket_definitions:
  # EXISTING: User specific data bucket
  user_data:
    parameters:
      - SELECT id as user_id FROM users
    data:
      # ... existing patient/notes rules ...

  # NEW: Admin data bucket (only for admins)
  admin_data:
    parameters:
      # Create bucket only for admin users
      - SELECT u.id as admin_id 
        FROM users u
        INNER JOIN admins a ON u.id = a.user_id
    data:
      # All pending user signups (for approval)
      - SELECT id, first_name, last_name, email, account_type,
               city, countries, doctor_specialty, medical_license,
               created_at, authorized
        FROM users
        WHERE authorized = false
        ORDER BY created_at DESC

      # All existing users (for management)
      - SELECT id, first_name, last_name, email, account_type,
               city, countries, doctor_specialty, 
               created_at, authorized, approval_date
        FROM users
        WHERE authorized = true
        ORDER BY approval_date DESC

      # All admins (for admin management)
      - SELECT a.id, a.user_id, a.created_at,
               u.first_name, u.last_name, u.email
        FROM admins a
        INNER JOIN users u ON a.user_id = u.id

      # User settings (for complete user info)
      - SELECT id, user_id, languages, countries, doctor_specialty,
               created_at, updated_at
        FROM user_settings

      # Notifications sent by admins
      - SELECT id, title, message, type, sender_id,
               notify_doctors, notify_triage, created_at
        FROM admin_notifications
        ORDER BY created_at DESC
        LIMIT 100
```

### 1.2 Create PostgreSQL Views (if needed)

For complex queries, create views:

```sql
-- apps/powersync-server/migrations/admin_views.sql

-- View for pending signups with full details
CREATE OR REPLACE VIEW powersync_views.pending_signups AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.account_type,
  u.city,
  u.created_at,
  u.authorized,
  s.countries,
  s.languages,
  s.doctor_specialty
FROM users u
LEFT JOIN user_settings s ON u.id = s.user_id
WHERE u.authorized = false;

-- View for existing users with full details
CREATE OR REPLACE VIEW powersync_views.existing_users AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.account_type,
  u.city,
  u.created_at,
  u.authorized,
  u.approval_date,
  s.countries,
  s.languages,
  s.doctor_specialty
FROM users u
LEFT JOIN user_settings s ON u.id = s.user_id
WHERE u.authorized = true;
```

Then use views in sync rules:

```yaml
admin_data:
  parameters:
    - SELECT u.id as admin_id FROM users u
      INNER JOIN admins a ON u.id = a.user_id
  data:
    - SELECT * FROM powersync_views.pending_signups
    - SELECT * FROM powersync_views.existing_users
```

---

## Phase 2: Mobile App - PowerSync Schema

### 2.1 Define Admin Tables Schema

**File:** `apps/mobile/src/services/powersync/schema.ts`

```typescript
import { column, Schema, Table } from '@powersync/react-native';

// User table (both pending and existing)
const users = new Table({
  id: column.text,
  first_name: column.text,
  last_name: column.text,
  email: column.text,
  account_type: column.text,
  city: column.text,
  countries: column.text, // JSON array as string
  doctor_specialty: column.text, // JSON array as string
  medical_license: column.text,
  created_at: column.text,
  authorized: column.integer, // 0 or 1 (boolean)
  approval_date: column.text,
});

// Admin table
const admins = new Table({
  id: column.text,
  user_id: column.text,
  created_at: column.text,
  // Denormalized user info for easy display
  first_name: column.text,
  last_name: column.text,
  email: column.text,
});

// User settings
const user_settings = new Table({
  id: column.text,
  user_id: column.text,
  languages: column.text, // JSON array
  countries: column.text, // JSON array
  doctor_specialty: column.text, // JSON array
  created_at: column.text,
  updated_at: column.text,
});

// Admin notifications
const admin_notifications = new Table({
  id: column.text,
  title: column.text,
  message: column.text,
  type: column.text,
  sender_id: column.text,
  notify_doctors: column.integer,
  notify_triage: column.integer,
  created_at: column.text,
});

// Export schema
export const adminSchema = new Schema({
  users,
  admins,
  user_settings,
  admin_notifications,
});
```

### 2.2 Initialize PowerSync with Admin Schema

**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

Update initialization:

```typescript
import { adminSchema } from './schema';
import { getApiUrl } from '../../config';

async initialize(authToken: string): Promise<void> {
  if (this.isInitialized) {
    console.log('PowerSync already initialized');
    return;
  }

  try {
    // Create PowerSync database
    this.db = new PowerSyncDatabase({
      schema: adminSchema,
      database: {
        dbFilename: 'fajr-admin.db',
      },
    });

    // Connect to PowerSync server
    const powerSyncUrl = `${getApiUrl()}/powersync`; // Proxy through Next.js
    
    await this.db.connect({
      powerSyncUrl,
      token: authToken,
      retryDelayMs: 5000,
    });

    this.isInitialized = true;
    console.log('✅ PowerSync initialized for admin');
  } catch (error) {
    console.error('❌ PowerSync initialization failed:', error);
    throw error;
  }
}
```

---

## Phase 3: Update Admin ViewModels to Use PowerSync

### 3.1 Example: New Signups ViewModel with PowerSync

**File:** `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`

**Before (API-based):**
```typescript
const fetchUsers = async () => {
  const response = await adminApi.getNewUsers({ page, limit: 20 });
  setUsers(response.users);
};
```

**After (PowerSync-based):**
```typescript
import { usePowerSync, useQuery } from '@powersync/react-native';

export function useNewSignupsViewModel() {
  const powerSync = usePowerSync();
  
  // PowerSync query for pending signups
  const { data: users, isLoading, error } = useQuery<User>(
    'SELECT * FROM users WHERE authorized = 0 ORDER BY created_at DESC',
    {
      // Re-run query when data changes
      enabled: !!powerSync,
    }
  );

  // Parse JSON fields
  const parsedUsers = useMemo(() => {
    return users?.map(user => ({
      ...user,
      countries: JSON.parse(user.countries || '[]'),
      doctorSpecialty: JSON.parse(user.doctor_specialty || '[]'),
      authorized: user.authorized === 1,
    })) || [];
  }, [users]);

  // Approve user (queue for upload)
  const approveUser = async (userId: string) => {
    try {
      // Queue the change in PowerSync upload queue
      await powerSync.execute(
        'UPDATE users SET authorized = 1, approval_date = ? WHERE id = ?',
        [new Date().toISOString(), userId]
      );
      
      // The change will sync to server automatically
      Alert.alert('Success', 'User approved (will sync when online)');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve user');
    }
  };

  // Deny user (queue for upload)
  const denyUser = async (userId: string) => {
    try {
      await powerSync.execute(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );
      
      Alert.alert('Success', 'User denied (will sync when online)');
    } catch (error) {
      Alert.alert('Error', 'Failed to deny user');
    }
  };

  return {
    users: parsedUsers,
    isLoading,
    error,
    approveUser,
    denyUser,
    // ... rest of methods
  };
}
```

### 3.2 Hybrid Approach (Recommended)

For best UX, use **PowerSync for reads** and **API for complex writes**:

```typescript
export function useNewSignupsViewModel() {
  const powerSync = usePowerSync();
  const { token } = useAuth();

  // READ: From PowerSync (fast, offline)
  const { data: users } = useQuery<User>(
    'SELECT * FROM users WHERE authorized = 0 ORDER BY created_at DESC'
  );

  // WRITE: Via API (with optimistic update)
  const approveUser = async (userId: string) => {
    try {
      // Optimistic update (instant UI feedback)
      await powerSync.execute(
        'UPDATE users SET authorized = 1 WHERE id = ?',
        [userId]
      );
      
      // Send to server (will sync changes back)
      await adminApi.approveUsers({ userIds: [userId] });
      
      Alert.alert('Success', 'User approved');
    } catch (error) {
      // Rollback on error
      await powerSync.execute(
        'UPDATE users SET authorized = 0 WHERE id = ?',
        [userId]
      );
      Alert.alert('Error', 'Failed to approve user');
    }
  };

  return { users, approveUser };
}
```

---

## Phase 4: Server-Side Upload Processing

### 4.1 Create Upload Endpoint

PowerSync sends changes to a CRUD endpoint. Create or update:

**File:** `apps/web/app/api/powersync/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, admins } from '@/db/schema';

export async function PUT(request: NextRequest) {
  try {
    const transactions = await request.json();
    
    for (const tx of transactions) {
      for (const op of tx.crud) {
        const { table, op: operation, data } = op;
        
        if (table === 'users') {
          if (operation === 'UPDATE') {
            // User approval
            if (data.authorized === 1) {
              await db.update(users)
                .set({ 
                  authorized: true,
                  approvalDate: new Date(data.approval_date),
                })
                .where(eq(users.id, data.id));
            }
          } else if (operation === 'DELETE') {
            // User denial
            await db.delete(users).where(eq(users.id, data.id));
          }
        }
        
        if (table === 'admins') {
          if (operation === 'INSERT') {
            // Add admin
            await db.insert(admins).values({
              userId: data.user_id,
              createdAt: new Date(data.created_at),
            });
          } else if (operation === 'DELETE') {
            // Remove admin
            await db.delete(admins).where(eq(admins.id, data.id));
          }
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process uploads' },
      { status: 500 }
    );
  }
}
```

### 4.2 Configure Upload Endpoint in PowerSync

**File:** `apps/powersync-server/config/powersync.yaml`

```yaml
upload_url: ${NEXTAUTH_URL}/api/powersync/upload
upload_auth_header: Authorization
```

---

## Phase 5: Conflict Resolution

### 5.1 Define Conflict Scenarios

**Scenario 1: Two admins approve same user simultaneously**
- Admin A: Approves user (offline)
- Admin B: Approves user (offline)
- Both sync to server
- **Resolution**: Last write wins (already approved is OK)

**Scenario 2: One admin approves, another denies**
- Admin A: Approves user (offline)
- Admin B: Denies user (offline)
- Both sync to server
- **Resolution**: Manual conflict (alert both admins)

**Scenario 3: Admin edits user while user self-edits**
- Admin: Updates user email (offline)
- User: Updates own profile (online)
- **Resolution**: Admin wins (admins have priority)

### 5.2 Implement Conflict Resolver

```typescript
// apps/mobile/src/services/powersync/conflictResolver.ts

export async function resolveAdminConflict(
  table: string,
  localData: any,
  serverData: any
): Promise<any> {
  
  if (table === 'users') {
    // If both are approvals, server wins (already processed)
    if (localData.authorized === 1 && serverData.authorized === true) {
      return serverData; // Server processed first
    }
    
    // If approval vs denial, keep server version and alert
    if (localData.authorized !== serverData.authorized) {
      Alert.alert(
        'Conflict Detected',
        'Another admin modified this user. Server version kept.',
        [{ text: 'OK' }]
      );
      return serverData;
    }
  }
  
  // Default: server wins
  return serverData;
}
```

---

## Phase 6: UI Updates for Offline Indicators

### 6.1 Show Sync Status

```typescript
// apps/mobile/src/components/admin/SyncStatusIndicator.tsx

import { usePowerSyncStatus } from '@powersync/react-native';

export function SyncStatusIndicator() {
  const status = usePowerSyncStatus();
  
  const icon = status.connected ? '🟢' : '🔴';
  const text = status.connected ? 'Online' : 'Offline';
  
  const pendingUploads = status.uploadQueueStats?.count || 0;
  
  return (
    <View style={styles.container}>
      <Text>{icon} {text}</Text>
      {pendingUploads > 0 && (
        <Text style={styles.pending}>
          {pendingUploads} pending changes
        </Text>
      )}
    </View>
  );
}
```

### 6.2 Show Pending Actions

```typescript
<BulkActionBar
  selectedCount={selectedIds.length}
  actions={[
    {
      label: syncStatus.connected 
        ? 'Approve' 
        : 'Approve (offline)',
      onPress: handleApprove,
      variant: 'primary',
    },
  ]}
/>
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] **Day 1-2**: Update `sync-rules.yaml` with admin buckets
- [ ] **Day 3-4**: Create admin schema for mobile
- [ ] **Day 5**: Test PowerSync server with new rules

### Week 2: Mobile Integration
- [ ] **Day 1-2**: Update PowerSyncService initialization
- [ ] **Day 3-4**: Convert NewSignupsViewModel to PowerSync
- [ ] **Day 5**: Test offline read/write for signups

### Week 3: Remaining ViewModels
- [ ] **Day 1-2**: Convert ExistingUsersViewModel
- [ ] **Day 3**: Convert AdminManagementViewModel
- [ ] **Day 4**: Convert NotificationsViewModel
- [ ] **Day 5**: Testing all ViewModels

### Week 4: Upload & Conflicts
- [ ] **Day 1-2**: Implement upload endpoint
- [ ] **Day 3**: Implement conflict resolution
- [ ] **Day 4**: Add sync status indicators
- [ ] **Day 5**: End-to-end testing

### Week 5: Polish & Production
- [ ] **Day 1-2**: Error handling improvements
- [ ] **Day 3**: Performance optimization
- [ ] **Day 4**: Documentation
- [ ] **Day 5**: Deployment to staging

---

## Testing Strategy

### Unit Tests
```typescript
describe('useNewSignupsViewModel with PowerSync', () => {
  it('should fetch users from local database', async () => {
    // Test PowerSync query
  });
  
  it('should queue approval for upload', async () => {
    // Test offline approval
  });
  
  it('should handle conflicts', async () => {
    // Test conflict resolution
  });
});
```

### Integration Tests
1. **Offline Mode**: Disconnect network, perform actions, verify queue
2. **Sync Mode**: Reconnect, verify uploads complete
3. **Conflict Mode**: Simulate concurrent changes, verify resolution
4. **Performance**: Measure query speed vs API calls

### Manual Testing
- [ ] Approve user offline → sync online
- [ ] Two admins approve same user
- [ ] Airplane mode throughout entire workflow
- [ ] Poor connectivity (throttle network)

---

## Benefits of This Approach

### For Admins
✅ **Instant UI** - No waiting for API calls  
✅ **Work anywhere** - Remote areas, planes, etc.  
✅ **Reliable** - Queues changes, syncs when possible  
✅ **Fast** - Local SQLite queries are instant  

### For Development
✅ **Less API code** - PowerSync handles sync  
✅ **Automatic conflict resolution** - Built-in  
✅ **Type-safe** - SQL queries with TypeScript  
✅ **Offline testing** - Easy to test edge cases  

### For System
✅ **Less server load** - Reads from local DB  
✅ **Better scaling** - Only writes hit server  
✅ **Resilient** - Works during server issues  
✅ **Efficient** - Batch uploads, delta sync  

---

## Migration Path (Hybrid Approach)

You don't have to migrate everything at once. Recommended hybrid:

### Phase A: Keep Next.js APIs, Add PowerSync Reads
```typescript
// Reads from PowerSync (fast)
const { data: users } = useQuery('SELECT * FROM users...');

// Writes still go through API
await adminApi.approveUsers({ userIds });
```

**Benefits**: Fast reads, reliable writes, easy rollback

### Phase B: PowerSync Reads + Optimistic Writes
```typescript
// Optimistic local update
await powerSync.execute('UPDATE users...');

// Then sync to API
await adminApi.approveUsers({ userIds });
```

**Benefits**: Instant UI feedback, reliable sync

### Phase C: Full PowerSync (Target State)
```typescript
// Everything through PowerSync
await powerSync.execute('UPDATE users...');
// Automatic upload via CRUD endpoint
```

**Benefits**: Fully offline-capable, minimal API code

**Recommendation**: Start with Phase A, move to Phase B after testing, Phase C is optional.

---

## Next Steps (This Week)

### Step 1: Update Sync Rules (1 hour)
```bash
cd apps/powersync-server
# Edit config/sync-rules.yaml
# Add admin_data bucket
# Restart PowerSync container
docker-compose -f ../../docker-compose.powersync.yml restart
```

### Step 2: Create Mobile Schema (1 hour)
```bash
cd apps/mobile
# Create src/services/powersync/schema.ts
# Define admin tables
```

### Step 3: Test Basic Sync (2 hours)
```typescript
// In mobile app
const { data } = useQuery('SELECT * FROM users WHERE authorized = 0');
console.log('Pending signups:', data);
```

### Step 4: Update One ViewModel (3 hours)
- Start with `useNewSignupsViewModel`
- Replace API calls with PowerSync queries
- Test offline mode

---

## Conclusion

You're in a **great position** to add PowerSync to your admin dashboard:
- ✅ Infrastructure already running
- ✅ Mobile service skeleton exists  
- ✅ Admin views already built
- 🎯 Just need to connect the pieces

**The hardest part is done** (setting up PowerSync server). Now it's just:
1. Extend sync rules for admin data
2. Update mobile ViewModels to use PowerSync
3. Test offline functionality

**Estimated Total Time**: 2-3 weeks  
**Impact**: Huge improvement in UX and reliability  
**Risk**: Low (can run hybrid during migration)  

Start with just the New Signups section, get it working offline, then replicate the pattern to other sections. You've got this! 🚀

---

## Resources

- **PowerSync Docs**: https://docs.powersync.com/
- **Sync Rules Guide**: https://docs.powersync.com/usage/sync-rules
- **React Native Integration**: https://docs.powersync.com/client-sdk-references/react-native
- **Your PowerSync Setup**: `apps/powersync-server/`
- **Your Mobile Service**: `apps/mobile/src/services/powersync/PowerSyncService.ts`

**Questions?** Check the PowerSync docs or your existing web implementation at `apps/web/components/adminDashboard/sections/powersync/`
