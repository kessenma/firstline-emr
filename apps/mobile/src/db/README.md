# PowerSync Database Schema Documentation

## Overview

This directory contains the PowerSync schema definition for the mobile app's local SQLite database. The schema is designed to sync with the PostgreSQL backend via PowerSync's real-time sync infrastructure.

## Architecture

```
PostgreSQL (Backend) 
    ↕️ PowerSync Service
    ↕️ Local SQLite (Mobile App)
```

### Key Principles

1. **Snake_case in Database, camelCase in TypeScript**: The PostgreSQL schema uses `snake_case` for field names, while TypeScript interfaces use `camelCase`. Field mapping utilities handle automatic conversion.

2. **UUID Primary Keys**: All tables use UUID v4 strings as primary keys (stored as TEXT in SQLite).

3. **JSON Storage**: Complex objects (arrays, nested data) are serialized as JSON strings in TEXT columns.

4. **Timestamps as ISO Strings**: All datetime fields are stored as ISO 8601 strings.

5. **Boolean as Integer**: SQLite doesn't have a boolean type, so booleans are stored as 0/1 integers.

## Schema Files

### `powerSyncSchema.ts`

Main schema definition containing:
- **Synced Tables**: Tables that sync with PostgreSQL backend
- **Local-Only Tables**: Device-specific tables not synced to server
- **Type Exports**: TypeScript types for type-safe queries

## Tables Reference

### Core Synced Tables

#### 1. `users`
Healthcare providers and staff accounts.

**Key Fields:**
- `id` (UUID): Primary key
- `email`: User email address
- `first_name`, `last_name`: User name
- `account_type`: Role - `Doctor`, `Triage`, `Evac`, `Coordinator`, `Admin`, `SuperAdmin`
- `doctor_specialty`: JSON array of medical specialties
- `languages`, `countries`: JSON arrays
- `authorized`: Boolean (0/1) - account approval status

**Indexes:**
- `email_idx`: Fast email lookups
- `account_type_idx`: Filter by role
- `authorized_idx`: Filter by authorization status

**Use Cases:**
- User authentication and profile
- Doctor assignment and filtering
- Staff management

---

#### 2. `patients`
Primary patient records and demographics.

**Key Fields:**
- `id` (UUID): Primary key
- `first_name`, `last_name`: Patient name
- `dob`: Date of birth (ISO string)
- `gender`: `Male`, `Female`, `Other`, `Prefer Not to Say`
- `status`: `Waiting`, `Triaged`, `Awaiting Assignment`, `In Progress`, `Completed`, `Not Started`
- `priority`: `Urgent`, `High`, `Medium`, `Low`, `Not Selected`
- `chief_complaint`: Primary medical complaint
- `telegram_chat_id`: Telegram integration
- `coordinator_id` (UUID): Foreign key to `users.id`
- `specialties`: JSON array of required medical specialties

**Indexes:**
- `status_idx`, `priority_idx`: Dashboard filtering
- `telegram_chat_id_idx`: Message routing
- `coordinator_id_idx`: Assignment queries
- `created_at_idx`: Time-based sorting

**Use Cases:**
- Patient dashboard
- Triage workflow
- Patient search and filtering
- Communication routing

---

#### 3. `notes`
Clinical notes and documentation.

**Key Fields:**
- `id` (UUID): Primary key
- `patient_id` (UUID): Foreign key to `patients.id`
- `author_id` (UUID): Foreign key to `users.id`
- `note_type`: `Intake`, `Progress`, `Discharge`, `Consultation`, `Other`
- `content`: JSON object with note content
- `draft`: Boolean (0/1) - unpublished draft status
- `date`: Note date/time

**Indexes:**
- `patient_id_idx`: All notes for a patient
- `author_id_idx`: Notes by author
- `note_type_idx`: Filter by type
- `draft_idx`: Draft vs published

**Use Cases:**
- Patient medical records
- Clinical documentation
- Note drafts and revisions

---

#### 4. `visits`
Patient visit records and vitals.

**Key Fields:**
- `id` (UUID): Primary key
- `patient_id` (UUID): Foreign key to `patients.id`
- `visit_date`: Visit timestamp
- Vital signs: `temp`, `blood_pressure`, `hba1c`, etc.
- Lab results: `wbc`, `platelets`, `ast`, `alt`, etc.
- `file_upload_urls`: JSON array of document URLs

**Indexes:**
- `patient_id_idx`: All visits for a patient
- `visit_date_idx`: Chronological ordering

**Use Cases:**
- Patient visit history
- Vital signs tracking
- Lab result viewing

---

#### 5. `internal_message_threads`
Staff-to-staff communication threads.

**Key Fields:**
- `id` (UUID): Primary key
- `title`: Thread title
- `participants`: JSON array of user UUIDs
- `messages`: JSON array of message objects
- `status`: `active`, `archived`
- `is_group_chat`: Boolean (0/1)
- `last_activity`: Timestamp for sorting

**Indexes:**
- `status_idx`: Active vs archived
- `last_activity_idx`: Recent threads first

**Use Cases:**
- Staff collaboration
- Case discussions
- Internal announcements

---

#### 6. `internal_message_thread_participants`
Join table for thread membership with read tracking.

**Key Fields:**
- `thread_id` (UUID): Foreign key to `internal_message_threads.id`
- `user_id` (UUID): Foreign key to `users.id`
- `unread_count`: Number of unread messages
- `last_read_at`: Timestamp of last read

**Indexes:**
- `thread_user_idx`: Composite index for membership lookups

**Use Cases:**
- Unread message counts
- Thread membership queries
- Read receipts

---

#### 7. `telegram_threads`
Patient communication via Telegram.

**Key Fields:**
- `id` (UUID): Primary key
- `chat_id`: Telegram chat identifier
- `patient_id` (UUID): Foreign key to `patients.id`
- `messages`: JSON array of messages
- `status`: `active`, `archived`

**Indexes:**
- `chat_id_idx`: Fast Telegram routing
- `patient_id_idx`: Patient message history

**Use Cases:**
- Patient communication
- Telegram message history
- Care coordination

---

#### 8. `notifications`
System notifications for users.

**Key Fields:**
- `id` (UUID): Primary key
- `type`: `message`, `patient_update`, `system`, `alert`
- `message`: Notification text
- `patient_id` (UUID): Related patient (if applicable)
- `redirect_to`: Deep link URL

**Indexes:**
- `type_idx`: Filter by notification type
- `created_at_idx`: Recent first

**Use Cases:**
- Push notifications
- In-app alerts
- Activity feed

---

#### 9. `notification_recipients`
Join table for notification delivery.

**Key Fields:**
- `notification_id` (UUID): Foreign key to `notifications.id`
- `user_id` (UUID): Foreign key to `users.id`

**Indexes:**
- `user_notification_idx`: User's notifications

---

#### 10. `med_orders` (Legacy)
Legacy medication orders system.

**Note**: Being replaced by `rx_orders`. Kept for historical data.

---

#### 11. `rx_orders`
Prescription orders (new system).

**Key Fields:**
- `patient_id` (UUID): Foreign key to `patients.id`
- `rx_order_id`: Order identifier
- `prescribing_dr`: Doctor name
- `prescriptions`: JSON array of medications
- `rx_status`: Order status enum
- `pharmacy_qr_url`: QR code for pharmacy

**Use Cases:**
- Prescription management
- Pharmacy integration
- Order tracking

---

#### 12. `patient_photos`
Patient photo attachments.

**Key Fields:**
- `patient_id` (UUID): Foreign key to `patients.id`
- `url`: Photo URL

---

#### 13. `med_evac_patients`
Medical evacuation tracking (comprehensive form).

**Key Fields:**
- `patient_id` (UUID): Foreign key to `patients.id`
- `urgency`: Evacuation urgency level
- `treatment_status`: Current treatment status
- `hospital_acceptance_status`: Hospital submission status
- Multiple location, approval, and logistics fields
- `is_draft`: Boolean for incomplete forms

**Use Cases:**
- Medical evacuation workflows
- Multi-country coordination
- Complex approval tracking

---

### Local-Only Tables (Not Synced)

#### 14. `ui_state`
Local app state persistence.

**Key Fields:**
- `key`: State identifier (primary key)
- `value`: JSON state value
- `updated_at`: Last update timestamp

**Use Cases:**
- Filter preferences
- UI settings
- Last viewed items
- Search history

**Example Keys:**
```typescript
const UI_STATE_KEYS = {
  PATIENT_FILTERS: 'patient_filters',
  SORT_PREFERENCES: 'sort_preferences',
  LAST_SYNC_TIME: 'last_sync_time',
  SELECTED_TAB: 'selected_tab',
  SEARCH_HISTORY: 'search_history',
};
```

---

#### 15. `offline_queue`
Pending mutations when offline.

**Key Fields:**
- `operation`: `create`, `update`, `delete`
- `table_name`: Target table
- `record_id`: Record UUID
- `data`: JSON mutation payload
- `retry_count`: Number of retry attempts
- `error`: Last error message

**Use Cases:**
- Offline-first write operations
- Sync retry management
- Conflict detection

---

#### 16. `sync_metadata`
Sync status tracking per table.

**Key Fields:**
- `table_name`: Table identifier (primary key)
- `last_sync_at`: Last successful sync timestamp
- `last_sync_success`: Boolean (0/1)
- `last_sync_error`: Error message if failed
- `record_count`: Local record count
- `pending_uploads`: Unsynced mutations

**Use Cases:**
- Sync status UI
- Diagnostics
- Performance monitoring

---

## Usage Examples

### 1. Basic Query

```typescript
import { usePowerSync } from '@powersync/react-native';
import { TABLES } from './powerSyncSchema';

function usePatients() {
  const powerSync = usePowerSync();
  
  const patients = await powerSync.getAll(
    `SELECT * FROM ${TABLES.PATIENTS} WHERE status = ? ORDER BY created_at DESC`,
    ['Waiting']
  );
  
  return patients;
}
```

### 2. Join Query

```typescript
// Get patients with their assigned coordinators
const patientsWithCoordinators = await powerSync.getAll(`
  SELECT 
    p.*,
    u.first_name as coordinator_first_name,
    u.last_name as coordinator_last_name,
    u.email as coordinator_email
  FROM ${TABLES.PATIENTS} p
  LEFT JOIN ${TABLES.USERS} u ON p.coordinator_id = u.id
  WHERE p.status = ?
  ORDER BY p.priority DESC, p.created_at DESC
`, ['In Progress']);
```

### 3. Watch Query (Real-time Updates)

```typescript
import { usePowerSyncWatchedQuery } from '@powersync/react-native';

function PatientList() {
  const { data: patients } = usePowerSyncWatchedQuery(
    `SELECT * FROM ${TABLES.PATIENTS} WHERE status != ? ORDER BY priority DESC`,
    ['Completed']
  );
  
  // Re-renders automatically when data changes
  return <List data={patients} />;
}
```

### 4. Field Mapping Integration

```typescript
import { rowToEntity } from '@/utils/fieldMapping';
import type { Patient } from '@/types/patient';

// Query returns snake_case
const rows = await powerSync.getAll(`SELECT * FROM ${TABLES.PATIENTS}`);

// Convert to camelCase TypeScript objects
const patients: Patient[] = rows.map(row => rowToEntity<Patient>(row));
```

### 5. Local State Persistence

```typescript
// Save UI state
await powerSync.execute(
  `INSERT OR REPLACE INTO ${TABLES.UI_STATE} (key, value, updated_at) VALUES (?, ?, ?)`,
  ['patient_filters', JSON.stringify(filters), new Date().toISOString()]
);

// Load UI state
const result = await powerSync.get(
  `SELECT value FROM ${TABLES.UI_STATE} WHERE key = ?`,
  ['patient_filters']
);
const filters = JSON.parse(result?.value || '{}');
```

### 6. Offline Mutation Tracking

```typescript
// Queue a mutation for later sync
await powerSync.execute(
  `INSERT INTO ${TABLES.OFFLINE_QUEUE} 
   (id, operation, table_name, record_id, data, retry_count, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [
    uuidv4(),
    'update',
    TABLES.PATIENTS,
    patientId,
    JSON.stringify(updateData),
    0,
    new Date().toISOString()
  ]
);
```

---

## Type Safety

The schema exports TypeScript types for compile-time safety:

```typescript
import type { PowerSyncTableName } from './powerSyncSchema';

// Type-safe table names
const tableName: PowerSyncTableName = 'patients'; // ✅
const invalid: PowerSyncTableName = 'invalid_table'; // ❌ Compile error
```

---

## Indexes and Performance

### Index Strategy

1. **Foreign Keys**: All foreign key columns are indexed for join performance
2. **Filter Fields**: Common filter fields (status, priority, type) are indexed
3. **Sort Fields**: Timestamp fields used for sorting are indexed
4. **Composite Indexes**: Multi-column indexes for common query patterns

### Query Optimization Tips

1. **Use indexes**: Always filter on indexed columns when possible
2. **Limit results**: Use `LIMIT` for large result sets
3. **Avoid SELECT ***: Select only needed columns
4. **Use prepared statements**: PowerSync caches query plans
5. **Batch operations**: Group multiple writes into transactions

---

## Data Types Reference

| PostgreSQL Type | SQLite Type | TypeScript Type | Notes |
|----------------|-------------|-----------------|-------|
| `UUID` | `TEXT` | `string` | Stored as string |
| `VARCHAR(n)` | `TEXT` | `string` | No length limit |
| `TEXT` | `TEXT` | `string` | - |
| `INTEGER` | `INTEGER` | `number` | - |
| `BOOLEAN` | `INTEGER` | `number` (0/1) | Use `column.integer` |
| `TIMESTAMP` | `TEXT` | `string` | ISO 8601 format |
| `REAL` | `REAL` | `number` | Floating point |
| `JSON` | `TEXT` | `string` | Serialized JSON |
| `JSONB` | `TEXT` | `string` | Serialized JSON |
| `TEXT[]` | `TEXT` | `string` | JSON array as text |

---

## Migration Considerations

### When Adding New Tables

1. Add table definition to `powerSyncSchema.ts`
2. Update sync rules in `sync-rules.yaml` on PowerSync service
3. Update TypeScript types in `src/types/`
4. Add field mapping in `src/utils/fieldMapping/`
5. Create service methods in `src/services/api/`

### When Modifying Existing Tables

1. **Additive changes** (new columns): Safe, requires no migration
2. **Rename/remove columns**: Requires migration and app version coordination
3. **Change column types**: Requires data migration

### Schema Version Management

PowerSync handles schema versioning automatically, but:
- Breaking changes require app updates
- Test migrations thoroughly in staging
- Use feature flags for gradual rollout

---

## Best Practices

### 1. Always Use Field Mapping

```typescript
// ❌ Don't access snake_case directly
const name = patient.first_name;

// ✅ Convert to camelCase
const typedPatient = rowToEntity<Patient>(patient);
const name = typedPatient.firstName;
```

### 2. Handle JSON Fields

```typescript
// ❌ Don't forget to parse JSON
const specialties = patient.specialties; // string!

// ✅ Parse JSON fields
const specialties = JSON.parse(patient.specialties || '[]');
```

### 3. Use Transactions for Batch Writes

```typescript
await powerSync.writeTransaction(async (tx) => {
  for (const patient of patients) {
    await tx.execute(`INSERT INTO patients ...`, [...]);
  }
});
```

### 4. Handle Sync Conflicts

```typescript
// PowerSync will call this for conflicts
uploadData: async (database) => {
  const transactions = await database.getAll(
    'SELECT * FROM ps_tx WHERE upload_status IS NULL'
  );
  
  // Upload to backend and handle conflicts
  // Return conflict resolution
}
```

---

## Troubleshooting

### Issue: Query returns empty results

**Check:**
1. Is data synced? Check `sync_metadata` table
2. Are sync rules configured correctly?
3. Is user authenticated?
4. Check PowerSync service logs

### Issue: Field mapping errors

**Check:**
1. Are all fields defined in mapping config?
2. JSON fields properly stringified?
3. Boolean values as 0/1 integers?

### Issue: Slow queries

**Check:**
1. Missing indexes on filter/join columns
2. Too many joined tables
3. Large result sets without `LIMIT`
4. Complex JSON parsing in queries

---

## Related Documentation

- [PowerSync React Native Docs](https://docs.powersync.com/client-sdk/react-native)
- [Field Mapping System](../utils/fieldMapping/README.md)
- [API Services](../services/api/README.md)
- [Migration Plan](../../docs/sql-transtion/SQL_MOBILE_TRANSITION.md)

---

## Support

For schema-related questions:
1. Check this documentation
2. Review SQL_MOBILE_TRANSITION.md
3. Check PowerSync service logs
4. Review sync rules configuration

**Last Updated**: December 2024  
**Schema Version**: 1.0.0