# Hook Migration Guide: Legacy → PowerSync

## 📋 Overview

This guide explains how to migrate from legacy HTTP-based hooks to PowerSync-based hooks for offline-first, real-time functionality.

## 🎯 Migration Goals

1. **Remove HTTP polling** → Real-time PowerSync updates
2. **Remove manual caching** → PowerSync handles caching automatically
3. **Add offline support** → Works without network connection
4. **Improve performance** → Faster queries, less network usage
5. **Simplify code** → Less boilerplate, cleaner APIs

---

## 📊 Migration Status

| Hook | Legacy | PowerSync | Status | Priority |
|------|--------|-----------|--------|----------|
| `useMessages` | ✅ | ✅ | **Migrated** | High |
| `useMessagesWithCache` | ✅ | ✅ (replaced) | **Deprecated** | High |
| `usePatients` | ❌ | ✅ | **New** | High |
| `useNotes` | ❌ | ✅ | **New** | High |
| `useMediaManager` | ✅ | ⏳ | Pending | Medium |
| `useErrorHandler` | ✅ | ✅ (compatible) | No changes | Low |
| `useViewModel` | ✅ | ⏳ | Pending | Low |

---

## 🔄 Migration Patterns

### Pattern 1: Simple HTTP Hook → PowerSync Hook

**Before (Legacy):**
```typescript
// useMessages.ts
import { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

export function useMessages() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        
        const response = await fetch(getApiUrl('/internal-messages'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        setThreads(data.threads);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, []);

  return { threads, loading, error };
}
```

**After (PowerSync):**
```typescript
// useMessagesPowerSync.ts
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';

export function useMessagesPowerSync() {
  const query = usePowerSyncQuery(
    `SELECT * FROM ${TABLES.INTERNAL_MESSAGE_THREADS}
     WHERE status = ?
     ORDER BY last_activity DESC`,
    ['active'],
    {
      refetchInterval: 30000, // Optional: auto-refresh
    }
  );

  const threads = useMemo(() => {
    return (query.data || []).map(row => convertToThread(row));
  }, [query.data]);

  return {
    threads,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
```

**Benefits:**
- ✅ Real-time updates (no manual refetch needed)
- ✅ Offline support (cached data)
- ✅ 70% less code
- ✅ No manual error handling
- ✅ Automatic retries

---

### Pattern 2: HTTP Hook with Manual Caching → PowerSync (No Cache Needed)

**Before (Legacy with Couchbase Lite):**
```typescript
// useMessagesWithCache.ts
import { useState, useEffect } from 'react';
import { MessageCacheService } from '../services/MessageCacheService';

export function useMessagesWithCache() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    // Load from cache first
    const loadCache = async () => {
      const cached = await MessageCacheService.get();
      if (cached) {
        setThreads(cached);
        setIsFromCache(true);
        setLoading(false);
      }
    };

    // Then fetch from network
    const fetchNetwork = async () => {
      try {
        const response = await fetch(...);
        const data = await response.json();
        
        // Update cache
        await MessageCacheService.set(data);
        
        setThreads(data);
        setIsFromCache(false);
      } catch (err) {
        // If network fails, keep using cache
        if (!threads.length) {
          setError(err);
        }
      }
    };

    loadCache();
    fetchNetwork();
  }, []);

  return { threads, loading, isFromCache };
}
```

**After (PowerSync - No Cache Needed!):**
```typescript
// useMessagesPowerSync.ts
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';

export function useMessagesPowerSync() {
  const query = usePowerSyncQuery(
    `SELECT * FROM ${TABLES.INTERNAL_MESSAGE_THREADS}
     WHERE status = ?
     ORDER BY last_activity DESC`,
    ['active']
  );

  // That's it! PowerSync handles:
  // - Caching automatically
  // - Offline/online detection
  // - Real-time updates
  // - Sync in background

  return {
    threads: query.data || [],
    loading: query.isLoading,
    error: query.error,
  };
}
```

**Benefits:**
- ✅ Remove entire caching layer (1000+ lines of code!)
- ✅ PowerSync handles cache automatically
- ✅ Simpler, more maintainable
- ✅ Better offline support

---

### Pattern 3: Creating New Entity Hooks

**Creating a new hook for patients:**

```typescript
// usePatients.ts
import { useMemo } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES, buildSelectQuery } from '@/db';
import { rowToEntity } from '@/utils/fieldMapping';
import type { Patient } from '@/types/patient';

export function usePatients(options = {}) {
  const { filters = {}, limit = 100 } = options;

  // Build query dynamically
  const { sql, params } = useMemo(() => {
    const conditions = [];
    const queryParams = [];

    if (filters.status) {
      conditions.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.priority) {
      conditions.push('priority = ?');
      queryParams.push(filters.priority);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    return {
      sql: `SELECT * FROM ${TABLES.PATIENTS} 
            ${whereClause}
            ORDER BY priority DESC, created_at DESC
            LIMIT ${limit}`,
      params: queryParams,
    };
  }, [filters, limit]);

  // Query with PowerSync
  const query = usePowerSyncQuery(sql, params, {
    refetchInterval: 30000,
  });

  // Convert to typed objects with field mapping
  const patients = useMemo(() => {
    if (!query.data) return [];
    return query.data.map(row => rowToEntity<Patient>(row));
  }, [query.data]);

  return {
    patients,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
```

---

## 🔧 Step-by-Step Migration Process

### Step 1: Identify Hook to Migrate

Review your existing hook:
- Does it fetch from HTTP API?
- Does it use manual caching?
- Does it poll for updates?
- Is the data in PowerSync schema?

### Step 2: Find Corresponding PowerSync Table

```typescript
// Check src/db/powerSyncSchema.ts
import { TABLES } from '@/db';

console.log(TABLES.PATIENTS);      // 'patients'
console.log(TABLES.NOTES);         // 'notes'
console.log(TABLES.INTERNAL_MESSAGE_THREADS); // etc.
```

### Step 3: Write PowerSync Query

```typescript
// Replace HTTP fetch with SQL query
const query = usePowerSyncQuery(
  `SELECT * FROM ${TABLES.YOUR_TABLE} WHERE condition = ?`,
  [value],
  {
    refetchInterval: 30000, // optional
    enabled: true,          // optional
  }
);
```

### Step 4: Add Field Mapping

```typescript
import { rowToEntity } from '@/utils/fieldMapping';

// Convert snake_case database rows to camelCase TypeScript
const items = useMemo(() => {
  if (!query.data) return [];
  return query.data.map(row => rowToEntity<YourType>(row));
}, [query.data]);
```

### Step 5: Handle Mutations (Create/Update/Delete)

```typescript
import { usePowerSyncMutation } from './powersync';
import { entityToRow } from '@/utils/fieldMapping';

export function useYourMutations() {
  const mutation = usePowerSyncMutation();

  const updateItem = async (id, data) => {
    const dbRow = entityToRow(data);
    const fields = Object.keys(dbRow);
    const values = Object.values(dbRow);
    
    await mutation.mutateAsync({
      sql: `UPDATE ${TABLES.YOUR_TABLE} 
            SET ${fields.map(f => `${f} = ?`).join(', ')}, 
                updated_at = ?
            WHERE id = ?`,
      params: [...values, new Date().toISOString(), id],
    });
  };

  return { updateItem, loading: mutation.isPending };
}
```

### Step 6: Update Components

**Before:**
```tsx
import { useMessages } from '@/hooks/useMessages';

function MyComponent() {
  const { threads, loading, refresh } = useMessages();
  
  return <ThreadList threads={threads} onRefresh={refresh} />;
}
```

**After:**
```tsx
import { useMessagesPowerSync } from '@/hooks/useMessagesPowerSync';

function MyComponent() {
  const { threads, loading, refresh } = useMessagesPowerSync();
  
  return <ThreadList threads={threads} onRefresh={refresh} />;
}
```

### Step 7: Test Thoroughly

- ✅ Test with network connected
- ✅ Test offline (airplane mode)
- ✅ Test real-time updates (change data in another client)
- ✅ Test filters and pagination
- ✅ Test error states
- ✅ Test loading states

### Step 8: Remove Legacy Code

Once confirmed working:
1. Delete old hook file
2. Update all imports
3. Remove Couchbase Lite services (if no longer needed)
4. Remove HTTP polling logic
5. Update documentation

---

## 🎨 Common Patterns

### Pattern: Filter by Multiple Conditions

```typescript
export function usePatients(filters) {
  const { sql, params } = useMemo(() => {
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    const where = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    return {
      sql: `SELECT * FROM ${TABLES.PATIENTS} ${where}`,
      params,
    };
  }, [filters]);

  return usePowerSyncQuery(sql, params);
}
```

### Pattern: JOIN Multiple Tables

```typescript
export function usePatientsWithCoordinators() {
  const query = usePowerSyncQuery(`
    SELECT 
      p.*,
      u.first_name as coordinator_first_name,
      u.last_name as coordinator_last_name
    FROM ${TABLES.PATIENTS} p
    LEFT JOIN ${TABLES.USERS} u ON p.coordinator_id = u.id
    WHERE p.status = ?
    ORDER BY p.priority DESC
  `, ['Active']);

  return {
    patients: query.data || [],
    loading: query.isLoading,
  };
}
```

### Pattern: Aggregate Queries (COUNT, SUM, etc.)

```typescript
export function usePatientStats() {
  const query = usePowerSyncQuery(`
    SELECT 
      status,
      COUNT(*) as count
    FROM ${TABLES.PATIENTS}
    WHERE archived = 0
    GROUP BY status
  `);

  const stats = useMemo(() => {
    return (query.data || []).reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
  }, [query.data]);

  return { stats, loading: query.isLoading };
}
```

### Pattern: Debounced Search

```typescript
export function usePatientSearch(searchTerm, debounceMs = 300) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchTerm, debounceMs]);

  const query = usePowerSyncQuery(
    `SELECT * FROM ${TABLES.PATIENTS}
     WHERE first_name LIKE ? OR last_name LIKE ?
     LIMIT 50`,
    [`%${debouncedTerm}%`, `%${debouncedTerm}%`],
    { enabled: debouncedTerm.length > 2 }
  );

  return { patients: query.data || [], loading: query.isLoading };
}
```

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Forgetting Field Mapping

**Problem:**
```typescript
// ❌ Wrong: Accessing snake_case directly
const name = patient.first_name; // TypeScript error!
```

**Solution:**
```typescript
// ✅ Correct: Use field mapping
import { rowToEntity } from '@/utils/fieldMapping';

const patient = rowToEntity<Patient>(row);
const name = patient.firstName; // camelCase!
```

### Pitfall 2: Not Parsing JSON Fields

**Problem:**
```typescript
// ❌ Wrong: JSON is stored as string
const specialties = patient.specialties; // string!
specialties.map(...); // Error: map is not a function
```

**Solution:**
```typescript
// ✅ Correct: Parse JSON fields
const specialties = JSON.parse(patient.specialties || '[]');
specialties.map(...); // Works!

// Or use helper:
import { parseJsonField } from '@/db';
const specialties = parseJsonField(patient.specialties, []);
```

### Pitfall 3: Boolean Values

**Problem:**
```typescript
// ❌ Wrong: SQLite uses 0/1 for booleans
if (patient.archived) { ... } // Always truthy if it's 0 or 1!
```

**Solution:**
```typescript
// ✅ Correct: Compare explicitly or use helper
if (patient.archived === 1) { ... }

// Or use helper:
import { intToBool } from '@/db';
if (intToBool(patient.archived)) { ... }
```

### Pitfall 4: Missing enabled Option

**Problem:**
```typescript
// ❌ Wrong: Query runs even when ID is undefined
const query = usePowerSyncQuery(
  `SELECT * FROM patients WHERE id = ?`,
  [patientId] // undefined initially
);
```

**Solution:**
```typescript
// ✅ Correct: Disable query until ID is available
const query = usePowerSyncQuery(
  `SELECT * FROM patients WHERE id = ?`,
  [patientId],
  { enabled: !!patientId }
);
```

### Pitfall 5: Not Handling Empty Results

**Problem:**
```typescript
// ❌ Wrong: Assuming data exists
const patient = query.data[0].firstName; // Error if empty!
```

**Solution:**
```typescript
// ✅ Correct: Handle undefined/empty
const patient = query.data?.[0];
if (!patient) return <NotFound />;

const name = patient.firstName;
```

---

## 📈 Performance Tips

### Tip 1: Use Indexes

```sql
-- Schema already has indexes on common fields
-- Make sure you're filtering on indexed columns:
WHERE status = ?        -- ✅ Indexed
WHERE priority = ?      -- ✅ Indexed
WHERE created_at > ?    -- ✅ Indexed
WHERE dashboard_notes LIKE ? -- ❌ Not indexed (slow)
```

### Tip 2: Limit Results

```typescript
// ✅ Always use LIMIT for large tables
SELECT * FROM patients LIMIT 100
```

### Tip 3: Select Only Needed Columns

```typescript
// ❌ Slow: SELECT *
SELECT * FROM patients

// ✅ Fast: Select specific columns
SELECT id, first_name, last_name, status FROM patients
```

### Tip 4: Use Pagination

```typescript
export function usePatientsPaginated(page = 0, pageSize = 50) {
  const offset = page * pageSize;
  
  const query = usePowerSyncQuery(
    `SELECT * FROM ${TABLES.PATIENTS}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );

  return { patients: query.data, loading: query.isLoading };
}
```

### Tip 5: Adjust Refetch Interval

```typescript
// Frequently changing data: short interval
usePowerSyncQuery(sql, params, {
  refetchInterval: 5000, // 5 seconds
});

// Rarely changing data: long interval
usePowerSyncQuery(sql, params, {
  refetchInterval: 60000, // 1 minute
});

// Static data: no refetch
usePowerSyncQuery(sql, params, {
  refetchInterval: false,
});
```

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] PowerSync service is running
- [ ] Schema is defined for your data
- [ ] Field mapping is configured
- [ ] Sync rules are set up
- [ ] Test data is synced

### During Migration
- [ ] Identify legacy hook to migrate
- [ ] Write PowerSync equivalent
- [ ] Add field mapping
- [ ] Test offline functionality
- [ ] Test real-time updates
- [ ] Update components
- [ ] Update tests

### Post-Migration
- [ ] Remove legacy hook file
- [ ] Remove caching services (if unused)
- [ ] Update documentation
- [ ] Monitor performance
- [ ] Collect feedback

---

## 📚 Reference

### Available Hooks

| Hook | Purpose | File |
|------|---------|------|
| `usePowerSyncQuery` | Basic query | `hooks/powersync/usePowerSyncQuery.ts` |
| `usePowerSyncMutation` | Create/Update/Delete | `hooks/powersync/usePowerSyncMutation.ts` |
| `useSyncStatus` | Sync monitoring | `hooks/powersync/useSyncStatus.ts` |
| `useMessagesPowerSync` | Messages with real-time | `hooks/useMessagesPowerSync.ts` |
| `usePatients` | Patient queries | `hooks/usePatients.ts` |
| `useNotes` | Clinical notes | `hooks/useNotes.ts` |

### Helper Functions

| Function | Purpose | Import From |
|----------|---------|-------------|
| `rowToEntity` | DB row → TypeScript object | `@/utils/fieldMapping` |
| `entityToRow` | TypeScript object → DB row | `@/utils/fieldMapping` |
| `parseJsonField` | Parse JSON safely | `@/db` |
| `generateId` | Create UUID | `@/db` |
| `dateToIsoString` | Date → ISO string | `@/db` |

### Documentation Links

- [PowerSync Schema](../db/README.md)
- [Field Mapping Guide](../utils/fieldMapping/README.md)
- [PowerSync Hooks API](./powersync/README.md)
- [Migration Plan](../../docs/sql-transtion/SQL_MOBILE_TRANSITION.md)

---

## 🤝 Need Help?

1. Check existing PowerSync hooks for examples
2. Review schema documentation
3. Test in isolation before full migration
4. Ask team for code review

**Happy migrating! 🚀**