# PowerSync Admin Dashboard - Quick Start Guide

**Goal:** Get admin data syncing to your mobile app in the next 2 hours.

---

## Prerequisites

✅ PowerSync server running (`docker-compose.powersync.yml`)  
✅ Mobile app with PowerSync dependencies installed  
✅ Admin views built (from previous sections)  
✅ Can log in to mobile app  

---

## Step 1: Update Sync Rules (30 minutes)

### Edit the sync rules file

**File:** `apps/powersync-server/config/sync-rules.yaml`

Add this admin bucket **after** the existing `user_data` bucket:

```yaml
bucket_definitions:
  # ... existing user_data bucket ...

  # NEW: Admin data bucket
  admin_data:
    parameters:
      # Only create bucket for admin users
      - SELECT u.id as admin_id 
        FROM users u
        INNER JOIN admins a ON u.id = a.user_id
    
    data:
      # Pending user signups (unauthorized users)
      - SELECT 
          id,
          first_name,
          last_name,
          email,
          account_type,
          city,
          created_at,
          authorized
        FROM users
        WHERE authorized = false
        ORDER BY created_at DESC
        LIMIT 100

      # Existing users (authorized)
      - SELECT 
          id,
          first_name,
          last_name,
          email,
          account_type,
          city,
          created_at,
          authorized,
          approval_date
        FROM users
        WHERE authorized = true
        ORDER BY approval_date DESC
        LIMIT 500

      # Admin users
      - SELECT 
          a.id,
          a.user_id,
          a.created_at,
          u.first_name,
          u.last_name,
          u.email
        FROM admins a
        INNER JOIN users u ON a.user_id = u.id
```

### Restart PowerSync

```bash
cd /Users/ke/ws/fajr-medflow-emr
docker-compose -f docker-compose.powersync.yml restart powersync
```

### Verify sync rules

```bash
# Check logs
docker-compose -f docker-compose.powersync.yml logs -f powersync

# Look for: "Sync rules loaded successfully"
```

---

## Step 2: Create Mobile Schema (20 minutes)

### Create schema file

**File:** `apps/mobile/src/services/powersync/adminSchema.ts`

```typescript
import { column, Schema, Table } from '@powersync/react-native';

// Users table (both pending and existing)
const users = new Table(
  {
    // Basic info
    id: column.text,
    first_name: column.text,
    last_name: column.text,
    email: column.text,
    account_type: column.text,
    city: column.text,
    created_at: column.text,
    
    // Authorization
    authorized: column.integer, // 0 = pending, 1 = approved
    approval_date: column.text,
  },
  { indexes: { authorized: ['authorized'], email: ['email'] } }
);

// Admins table
const admins = new Table({
  id: column.text,
  user_id: column.text,
  created_at: column.text,
  // Denormalized for easy display
  first_name: column.text,
  last_name: column.text,
  email: column.text,
});

// Export combined schema
export const adminSchema = new Schema({
  users,
  admins,
});
```

---

## Step 3: Initialize PowerSync in Mobile (30 minutes)

### Update PowerSync initialization

**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

Add initialization method:

```typescript
import { PowerSyncDatabase } from '@powersync/react-native';
import { adminSchema } from './adminSchema';

export class PowerSyncService {
  private db: PowerSyncDatabase | null = null;
  private static instance: PowerSyncService;

  static getInstance(): PowerSyncService {
    if (!PowerSyncService.instance) {
      PowerSyncService.instance = new PowerSyncService();
    }
    return PowerSyncService.instance;
  }

  async initialize(authToken: string): Promise<void> {
    if (this.db) {
      console.log('✅ PowerSync already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing PowerSync...');
      
      // Create database with admin schema
      this.db = new PowerSyncDatabase({
        schema: adminSchema,
        database: {
          dbFilename: 'fajr-admin.db',
        },
      });

      // Connect to PowerSync server (through Next.js proxy)
      const apiUrl = 'https://emr.fajr.org'; // or your API URL
      const powerSyncUrl = `${apiUrl}/api/powersync`;

      await this.db.connect({
        powerSyncUrl,
        token: authToken,
        retryDelayMs: 5000,
      });

      console.log('✅ PowerSync initialized and connected');
    } catch (error) {
      console.error('❌ PowerSync initialization failed:', error);
      throw error;
    }
  }

  getDatabase(): PowerSyncDatabase {
    if (!this.db) {
      throw new Error('PowerSync not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.disconnectAndClear();
      this.db = null;
      console.log('🔌 PowerSync disconnected');
    }
  }
}
```

### Initialize on login

**File:** `apps/mobile/src/screens/LoginScreen.tsx`

Add PowerSync initialization after successful login:

```typescript
import { PowerSyncService } from '../services/powersync/PowerSyncService';

// In handleLogin function, after successful login:
const handleLogin = async () => {
  // ... existing login code ...
  
  if (response.success && response.user) {
    // Store in AuthContext
    await login(response.user.token, response.user);
    
    // Initialize PowerSync if user is admin
    if (response.user.isAdmin) {
      try {
        const powerSyncService = PowerSyncService.getInstance();
        await powerSyncService.initialize(response.user.token);
        console.log('✅ PowerSync ready for admin');
      } catch (error) {
        console.error('⚠️ PowerSync init failed (non-blocking):', error);
        // Don't block login if PowerSync fails
      }
    }
    
    onLoginSuccess(response.user);
  }
};
```

---

## Step 4: Test Basic Sync (20 minutes)

### Create test screen

**File:** `apps/mobile/src/screens/PowerSyncTestScreen.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { PowerSyncService } from '../services/powersync/PowerSyncService';

export default function PowerSyncTestScreen() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testQuery = async () => {
    try {
      setLoading(true);
      setError(null);

      const db = PowerSyncService.getInstance().getDatabase();
      
      // Query pending signups
      const result = await db.execute(
        'SELECT * FROM users WHERE authorized = 0 ORDER BY created_at DESC LIMIT 10'
      );

      console.log('📊 Query result:', result);
      setPendingUsers(result.rows?._array || []);
      
      // Also log counts
      const countResult = await db.execute('SELECT COUNT(*) as count FROM users');
      console.log('Total users synced:', countResult.rows?._array[0]?.count);

    } catch (err) {
      console.error('❌ Query error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testQuery();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>PowerSync Test</Text>
      
      <Button 
        title={loading ? "Loading..." : "Refresh"} 
        onPress={testQuery}
        disabled={loading}
      />

      {error && (
        <Text style={styles.error}>Error: {error}</Text>
      )}

      <Text style={styles.subtitle}>
        Pending Signups: {pendingUsers.length}
      </Text>

      {pendingUsers.map((user, index) => (
        <View key={user.id || index} style={styles.userCard}>
          <Text style={styles.userName}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userType}>{user.account_type}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  userCard: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userType: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});
```

### Add test route

**File:** `apps/mobile/src/navigation/MainNavigator.tsx`

```typescript
// Add to your navigation stack
<Stack.Screen 
  name="PowerSyncTest" 
  component={PowerSyncTestScreen}
  options={{ title: 'PowerSync Test' }}
/>
```

### Run the test

1. Login as an admin user
2. Navigate to PowerSync Test screen
3. You should see pending users synced from the database
4. Check console logs for sync status

---

## Step 5: Update One ViewModel (40 minutes)

### Convert NewSignupsViewModel to PowerSync

**File:** `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`

Replace the API-based fetching with PowerSync:

```typescript
import { usePowerSync, useQuery } from '@powersync/react';
import { useEffect, useState, useMemo } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
  city: string;
  created_at: string;
  authorized: number; // 0 or 1
}

export function useNewSignupsViewModel() {
  const powerSync = usePowerSync();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Query pending signups from PowerSync
  const { data: rawUsers, isLoading, error } = useQuery<User>(
    'SELECT * FROM users WHERE authorized = 0 ORDER BY created_at DESC'
  );

  // Parse and format users
  const users = useMemo(() => {
    return (rawUsers || []).map(user => ({
      ...user,
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      accountType: user.account_type,
      createdAt: user.created_at,
      authorized: user.authorized === 1,
    }));
  }, [rawUsers]);

  // Refresh functionality
  const refreshUsers = async () => {
    // PowerSync auto-refreshes, but we can force sync
    if (powerSync) {
      await powerSync.currentStatus?.then(status => {
        console.log('Sync status:', status);
      });
    }
  };

  // Selection management
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUserIds(prev =>
      prev.length === users.length
        ? []
        : users.map(u => u.id)
    );
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  // Actions (for now, keep using API)
  const approveUsers = async (userIds: string[]) => {
    // TODO: Implement with PowerSync or keep API
    // For hybrid approach, use API for now
    const { adminApi } = await import('../../utils/admin/adminApi');
    const { token } = await import('../../contexts/AuthContext');
    
    await adminApi.approveUsers({ userIds });
    clearSelection();
    await refreshUsers();
  };

  const denyUsers = async (userIds: string[]) => {
    const { adminApi } = await import('../../utils/admin/adminApi');
    await adminApi.denyUsers({ userIds });
    clearSelection();
    await refreshUsers();
  };

  return {
    users,
    isLoading,
    error: error?.message || null,
    selectedUserIds,
    isAllSelected: selectedUserIds.length === users.length && users.length > 0,
    toggleUserSelection,
    toggleSelectAll,
    clearSelection,
    refreshUsers,
    approveUsers,
    denyUsers,
  };
}
```

---

## Verification Checklist

After completing all steps, verify:

### ✅ PowerSync Server
- [ ] Sync rules updated with admin_data bucket
- [ ] PowerSync container restarted
- [ ] No errors in PowerSync logs
- [ ] Can see "Sync rules loaded" in logs

### ✅ Mobile Schema
- [ ] `adminSchema.ts` created with users + admins tables
- [ ] Schema imported in PowerSyncService
- [ ] No TypeScript errors

### ✅ Mobile Initialization
- [ ] PowerSync initializes on admin login
- [ ] No initialization errors in console
- [ ] Connection established (check logs)

### ✅ Data Sync
- [ ] Test screen shows pending users
- [ ] User count matches database
- [ ] Data updates when database changes
- [ ] No query errors

### ✅ ViewModel
- [ ] NewSignupsViewModel uses PowerSync
- [ ] Users display in UI
- [ ] No TypeScript errors
- [ ] Refresh works

---

## Troubleshooting

### "PowerSync not initialized"
- Make sure you're logged in as an admin
- Check that `initialize()` is called after login
- Verify admin status in user object

### "No users syncing"
- Check PowerSync server logs for sync errors
- Verify user is in admins table: `SELECT * FROM admins`
- Check sync rules syntax in YAML file
- Try restarting PowerSync container

### "Connection failed"
- Verify PowerSync URL is correct (should go through Next.js API)
- Check auth token is valid
- Ensure PowerSync server is running: `docker ps`
- Check network connectivity

### "Query returns empty"
- Verify there are pending signups: `SELECT * FROM users WHERE authorized = false`
- Check PowerSync sync status in logs
- Wait a few seconds for initial sync to complete
- Try manual refresh

### TypeScript errors
```bash
cd apps/mobile
npm install @powersync/react-native --save
npm install @powersync/react --save
```

---

## Next Steps

Once basic sync is working:

1. **Add Sync Status Indicator** to UI
2. **Convert Remaining ViewModels** (ExistingUsers, AdminManagement)
3. **Add Upload Queue** for offline actions
4. **Implement Conflict Resolution**
5. **Add Offline Indicators** to buttons

---

## Success Criteria

You'll know it's working when:

✅ Login as admin → PowerSync initializes  
✅ Test screen → Shows pending users  
✅ Database changes → Mobile updates automatically  
✅ Offline mode → Still shows cached data  
✅ No console errors  

---

## Time Estimate

- **Step 1** (Sync Rules): 30 min
- **Step 2** (Schema): 20 min
- **Step 3** (Init): 30 min
- **Step 4** (Test): 20 min
- **Step 5** (ViewModel): 40 min

**Total: ~2 hours 20 minutes**

---

## Getting Help

If stuck:
1. Check PowerSync logs: `docker-compose -f docker-compose.powersync.yml logs -f powersync`
2. Check mobile console logs
3. Review [Full Strategy Doc](./POWERSYNC_INTEGRATION_STRATEGY.md)
4. PowerSync docs: https://docs.powersync.com/

**Good luck! 🚀**