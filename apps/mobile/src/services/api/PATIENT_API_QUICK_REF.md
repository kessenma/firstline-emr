# Patient API Service - Quick Reference

## 🚀 Quick Start

```typescript
import { patientApiService } from './services/api/PatientApiService';

// Get patients with pagination
const response = await patientApiService.getPatients({
  page: 1,
  limit: 20,
  filters: { status: 'In Progress' }
});

// Get single patient
const patient = await patientApiService.getPatient('patient-id');

// Create patient with instant offline feedback
const result = await patientApiService.createPatientWriteThrough({
  firstName: 'John',
  lastName: 'Doe',
  status: 'Not Started'
});
```

---

## 📚 All Methods

### HTTP API Methods (Online)

```typescript
// List patients
await patientApiService.getPatients(options)

// Get single patient
await patientApiService.getPatient(id)

// Create patient
await patientApiService.createPatient(data)

// Update patient
await patientApiService.updatePatient(id, updates)

// Delete patient
await patientApiService.deletePatient(id)

// Archive/Unarchive
await patientApiService.archivePatient(id)
await patientApiService.unarchivePatient(id)
```

### PowerSync Offline Methods

```typescript
// List patients (offline)
await patientApiService.getPatientsOffline(options)

// Get single patient (offline)
await patientApiService.getPatientOffline(id)

// Search patients (offline)
await patientApiService.searchPatientsOffline(query)
```

### Write-Through Operations (Instant Local + Background Sync)

```typescript
// Create with write-through
await patientApiService.createPatientWriteThrough(data)

// Update with write-through
await patientApiService.updatePatientWriteThrough(id, updates)

// Delete with write-through
await patientApiService.deletePatientWriteThrough(id)
```

### Sync Status Tracking

```typescript
// Get sync status
await patientApiService.getPatientSyncStatus(id)

// Get all pending sync
await patientApiService.getPatientsWithPendingSync()

// Wait for sync
await patientApiService.waitForPatientSync(id, timeout)
```

---

## 📋 Common Patterns

### Pattern 1: List Patients with Filters

```typescript
const response = await patientApiService.getPatients({
  page: 2,
  limit: 50,
  sortBy: 'lastName',
  sortDirection: 'ASC',
  filters: {
    status: 'In Progress',
    priority: 'High',
    specialty: 'Cardiology',
    search: 'chest pain'
  },
  includeArchived: false
});

console.log('Total:', response.data.total);
console.log('Patients:', response.data.patients);
console.log('Source:', response.source); // 'http' or 'powersync'
```

### Pattern 2: Offline-First Query

```typescript
// Try PowerSync first (instant), fallback to HTTP
const getPatients = async () => {
  try {
    return await patientApiService.getPatientsOffline();
  } catch (error) {
    console.warn('Offline failed, trying HTTP:', error);
    return await patientApiService.getPatients();
  }
};
```

### Pattern 3: Create with Instant Feedback

```typescript
const createPatient = async (data) => {
  const result = await patientApiService.createPatientWriteThrough(data);
  
  if (result.success) {
    // Patient created locally - instant UI update!
    console.log('Patient created:', result.data);
    
    // Check sync status
    if (result.syncStatus.synced) {
      console.log('✅ Synced to server');
    } else {
      console.log('⏳ Will sync in background');
    }
  }
  
  return result;
};
```

### Pattern 4: Update with Optimistic UI

```typescript
const updatePatientStatus = async (id, status) => {
  // Update UI immediately (optimistic)
  setPatient(prev => ({ ...prev, status }));
  
  // Write to local DB + background sync
  const result = await patientApiService.updatePatientWriteThrough(id, { status });
  
  if (!result.success) {
    // Rollback UI on failure
    setPatient(prev => ({ ...prev, status: previousStatus }));
  }
  
  return result;
};
```

### Pattern 5: Monitor Sync Status

```typescript
const monitorSync = async (patientId) => {
  const status = await patientApiService.getPatientSyncStatus(patientId);
  
  console.log('Synced:', status.synced);
  console.log('Pending:', status.pendingChanges);
  console.log('Last sync:', status.lastSyncTime);
  
  if (!status.synced) {
    // Wait for sync (with timeout)
    const synced = await patientApiService.waitForPatientSync(patientId, 30000);
    
    if (synced) {
      console.log('✅ Sync complete');
    } else {
      console.log('⚠️ Sync timeout - will retry later');
    }
  }
};
```

### Pattern 6: Search Patients

```typescript
// Online search
const searchOnline = async (query) => {
  const response = await patientApiService.getPatients({
    filters: { search: query }
  });
  return response.data.patients;
};

// Offline search (instant)
const searchOffline = async (query) => {
  const response = await patientApiService.searchPatientsOffline(query);
  return response.data;
};
```

---

## 🔧 Query Options Reference

### PaginationOptions

```typescript
{
  page?: number;           // Page number (default: 1)
  limit?: number;          // Items per page (default: 20)
  sortBy?: string;         // Field to sort by (default: 'createdAt')
  sortDirection?: 'ASC' | 'DESC';  // Sort direction (default: 'DESC')
}
```

### PatientQueryOptions

```typescript
{
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  filters?: {
    status?: 'Not Started' | 'In Progress' | 'Completed' | 'Urgent';
    priority?: 'High' | 'Medium' | 'Low' | 'Not Selected';
    specialty?: string;
    search?: string;       // Searches name and chief complaint
    archiveFilter?: 'active' | 'archived' | 'both';
  };
  includeArchived?: boolean;
}
```

### PatientSyncStatus

```typescript
{
  id: string;
  synced: boolean;         // True if fully synced to server
  lastSyncTime?: Date;     // Last successful sync
  pendingChanges: boolean; // True if local changes awaiting sync
  conflicted: boolean;     // True if conflicts exist
}
```

### WriteThroughResult

```typescript
{
  success: boolean;        // True if local write succeeded
  data?: Patient;          // Patient data
  syncStatus: {
    id: string;
    synced: boolean;
    pendingChanges: boolean;
    conflicted: boolean;
  };
  error?: Error;          // Error if operation failed
}
```

---

## 🎯 Response Format

All methods return `ApiResponse<T>`:

```typescript
{
  data: T;                 // Response data
  source: 'http' | 'powersync' | 'cache';  // Data source
  synced: boolean;         // True if fully synced
  timestamp: Date;         // Response timestamp
  fromCache?: boolean;     // True if from cache
}
```

---

## ✅ Best Practices

### DO ✅

1. **Use write-through for mutations**
   ```typescript
   await patientApiService.createPatientWriteThrough(data);
   ```

2. **Use offline-first for reads**
   ```typescript
   await patientApiService.getPatientsOffline();
   ```

3. **Check sync status after writes**
   ```typescript
   const result = await service.createPatientWriteThrough(data);
   if (!result.syncStatus.synced) {
     showSyncPendingIndicator();
   }
   ```

4. **Handle offline scenarios gracefully**
   ```typescript
   try {
     return await service.getPatientsOffline();
   } catch {
     return await service.getPatients();
   }
   ```

### DON'T ❌

1. **Don't block UI on sync**
   ```typescript
   // ❌ Bad - blocks UI
   await service.createPatient(data);
   
   // ✅ Good - instant feedback
   await service.createPatientWriteThrough(data);
   ```

2. **Don't ignore sync errors**
   ```typescript
   // ❌ Bad
   await service.createPatientWriteThrough(data);
   
   // ✅ Good
   const result = await service.createPatientWriteThrough(data);
   if (result.error) {
     handleError(result.error);
   }
   ```

3. **Don't use HTTP when offline is available**
   ```typescript
   // ❌ Slow - always hits network
   await service.getPatients();
   
   // ✅ Fast - uses local DB
   await service.getPatientsOffline();
   ```

---

## 🐛 Troubleshooting

### Issue: Empty Results

**Problem:** Query returns no patients

**Solution:** Check filters and archive status
```typescript
// Include archived patients
await service.getPatientsOffline({ includeArchived: true });

// Check if PowerSync is initialized
console.log(powerSyncService.isReady());
```

### Issue: Data Not Syncing

**Problem:** Changes not appearing on server

**Solution:** Check sync status and wait
```typescript
const status = await service.getPatientSyncStatus(id);
if (!status.synced) {
  await service.waitForPatientSync(id);
}
```

### Issue: Slow Queries

**Problem:** Queries taking too long

**Solution:** Use offline-first methods
```typescript
// Slow - hits network
await service.getPatients();

// Fast - uses local DB
await service.getPatientsOffline();
```

---

## 📊 Performance Tips

1. **Use pagination** - Don't fetch all records at once
2. **Use offline methods** - Always faster than HTTP
3. **Batch operations** - Group multiple updates
4. **Monitor sync** - Track pending changes to avoid buildup
5. **Cache responses** - Leverage automatic caching

---

## 🔗 Related Documentation

- [Base API Service](./BaseApiService.ts)
- [PowerSync Service](../powersync/PowerSyncService.ts)
- [Field Mapping Guide](../../utils/FIELD_MAPPING_GUIDE.md)
- [Phase 3.2 Complete](../../docs/sql-transtion/PHASE_3_2_API_SERVICES_COMPLETE.md)

---

**Quick Access:** `apps/mobile/src/services/api/PatientApiService.ts`
