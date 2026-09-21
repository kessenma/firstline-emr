# PowerSync API Endpoints Documentation

## Overview

This directory contains API endpoints for monitoring and managing PowerSync synchronization between mobile apps and the web backend.

## Current Status

✅ **Implemented:**
- `GET /api/powersync/pending-queue` - Returns pending items (currently empty, needs queue table)
- `GET /api/powersync/processed-queue` - Returns successfully synced items
- `POST /api/powersync/pending-queue` - Retry a single queue item (placeholder)
- `POST /api/powersync/retry-all-failed` - Retry all failed items (placeholder)
- `POST /api/powersync/clear-completed-queue` - Clear completed items (placeholder)

⚠️ **Needs Implementation:**
- Dedicated `offline_queue` table in database
- Mobile app integration to report queue status
- Actual retry logic for failed items

---

## Endpoints

### 1. GET /api/powersync/pending-queue

Returns pending PowerSync items waiting to sync.

**Authentication:** Admin only

**Query Parameters:**
- `table` (optional) - Filter by table name
- `limit` (optional) - Number of items to return (default: 100)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "operation": "update",
      "tableName": "user_profile_logs",
      "recordId": "uuid",
      "userId": "uuid",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "data": { "field": "value" },
      "retryCount": 0,
      "error": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "attemptedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "message": "Pending queue requires a dedicated offline_queue table..."
}
```

**Current Behavior:**
Returns empty array since there's no dedicated queue table yet.

---

### 2. GET /api/powersync/processed-queue

Returns successfully synced PowerSync updates from all tables.

**Authentication:** Admin only

**Query Parameters:**
- `table` (optional) - Filter by table name
- `operation` (optional) - Filter by operation type (create/update/delete)
- `limit` (optional) - Number of items to return (default: 100)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "operation": "update",
      "tableName": "user_profile_logs",
      "recordId": "uuid",
      "userId": "uuid",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "data": { "field": "value" },
      "syncedAt": "2024-01-01T00:00:00Z",
      "source": "mobile",
      "duration": 5000
    }
  ],
  "count": 1
}
```

**Source Detection:**
- `mobile` - Changes that were queued offline (time difference > 5 seconds)
- `web` - Changes made directly online (time difference < 5 seconds)

**Current Behavior:**
✅ Fully functional - shows all synced changes from `user_profile_logs` table

---

### 3. POST /api/powersync/pending-queue

Retry a single failed queue item.

**Authentication:** Admin only

**Request Body:**
```json
{
  "id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Retry functionality requires mobile app integration...",
  "itemId": "uuid"
}
```

**Current Behavior:**
Placeholder - acknowledges request but doesn't perform actual retry.

---

### 4. POST /api/powersync/retry-all-failed

Retry all failed queue items.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Retry all functionality requires...",
  "retriedCount": 0
}
```

**Current Behavior:**
Placeholder - acknowledges request but doesn't perform actual retry.

---

### 5. POST /api/powersync/clear-completed-queue

Clear all completed queue items.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Clear completed functionality requires...",
  "clearedCount": 0
}
```

**Current Behavior:**
Placeholder - acknowledges request but doesn't perform actual clearing.

---

## To Implement Full Functionality

### Step 1: Create Database Tables

Create migration for `offline_queue` table:

```sql
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation VARCHAR(10) NOT NULL, -- 'create', 'update', 'delete'
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  attempted_at TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Step 2: Update Mobile App

Modify `OfflineAccountSwitcherService.ts` to:

1. Write to `offline_queue` table when offline
2. Update status as sync progresses
3. Move to `user_profile_logs` when complete
4. Update or delete from queue after sync

### Step 3: Update API Endpoints

**Pending Queue:**
```typescript
// Query offline_queue table
const items = await db
  .select()
  .from(offlineQueue)
  .where(
    or(
      eq(offlineQueue.status, 'pending'),
      eq(offlineQueue.status, 'failed')
    )
  )
  .orderBy(desc(offlineQueue.createdAt));
```

**Retry Item:**
```typescript
// Update queue item and trigger sync
await db
  .update(offlineQueue)
  .set({
    status: 'pending',
    retryCount: sql`${offlineQueue.retryCount} + 1`,
    error: null
  })
  .where(eq(offlineQueue.id, itemId));

// Trigger PowerSync to process this item
await triggerSync(itemId);
```

**Clear Completed:**
```typescript
// Delete or archive completed items
const deleted = await db
  .delete(offlineQueue)
  .where(eq(offlineQueue.status, 'completed'))
  .returning();
```

---

## Testing

### Test Processed Queue (Works Now!)

1. Open admin dashboard
2. Navigate to PowerSync → Processed Queue tab
3. You should see account type changes and other profile updates
4. Test filters (table, operation)

### Test Pending Queue (Empty Until Implementation)

1. Will show "No pending items" until queue table is created
2. After implementation:
   - Switch account type on mobile while offline
   - Check pending queue on web dashboard
   - Should show the pending change
   - Go back online on mobile
   - Item should disappear from pending queue
   - Item should appear in processed queue

---

## Architecture

```
Mobile App (Offline)
    ↓
Write to offline_queue table
    ↓
PowerSync detects change
    ↓
Syncs to backend when online
    ↓
Backend processes change
    ↓
Writes to user_profile_logs
    ↓
Updates offline_queue status
    ↓
Web dashboard shows in processed queue
```

---

## Security

All endpoints require:
- Valid authentication session (NextAuth or JWT)
- Admin role (`isAdmin: true`)

Unauthorized requests return 401.

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common status codes:
- `200` - Success
- `401` - Unauthorized (not admin)
- `500` - Server error

---

## Next Steps

1. ✅ API endpoints created
2. ⏳ Create `offline_queue` database table
3. ⏳ Update mobile app to use queue table
4. ⏳ Implement retry logic
5. ⏳ Test end-to-end flow

---

## Related Files

- Frontend components: `/apps/web/components/adminDashboard/sections/powersync/`
  - `QueueViewer.tsx` - Pending queue UI
  - `ProcessedQueueViewer.tsx` - Processed queue UI
  - `PowerSyncView.tsx` - Main dashboard with tabs

- Mobile service: `/apps/mobile/src/services/powersync/OfflineAccountSwitcherService.ts`

- Database schema: `/apps/web/db/schema/userProfileLogs.ts`

---

## Support

For questions or issues, check:
1. This README
2. `QUEUE_MONITORING_README.md` in components directory
3. PowerSync documentation: https://docs.powersync.com