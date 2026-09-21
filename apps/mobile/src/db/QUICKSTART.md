# PowerSync Schema Quick Start Guide

## 🚀 Getting Started

This guide will get you up and running with the PowerSync schema in 5 minutes.

---

## Installation

The schema is already set up! Just import what you need:

```typescript
import { powerSyncSchema, TABLES } from '@/db';
import { usePowerSync } from '@powersync/react-native';
```

---

## Basic Usage

### 1. Query Data

```typescript
import { usePowerSync } from '@powersync/react-native';
import { TABLES } from '@/db';

function MyComponent() {
  const powerSync = usePowerSync();
  
  // Simple query
  const patients = await powerSync.getAll(
    `SELECT * FROM ${TABLES.PATIENTS} WHERE status = ?`,
    ['Waiting']
  );
  
  return <PatientList data={patients} />;
}
```

### 2. Real-time Updates (Watch Query)

```typescript
import { usePowerSyncWatchedQuery } from '@powersync/react-native';
import { TABLES } from '@/db';

function PatientDashboard() {
  // Automatically re-renders when data changes!
  const { data: patients } = usePowerSyncWatchedQuery(
    `SELECT * FROM ${TABLES.PATIENTS} WHERE status = ?`,
    ['Waiting']
  );
  
  return <PatientList patients={patients} />;
}
```

### 3. Insert/Update Data

```typescript
import { usePowerSync } from '@powersync/react-native';
import { TABLES, generateId, dateToIsoString } from '@/db';

async function createPatient(data) {
  const powerSync = usePowerSync();
  
  await powerSync.execute(
    `INSERT INTO ${TABLES.PATIENTS} 
     (id, first_name, last_name, status, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      data.firstName,
      data.lastName,
      'Waiting',
      dateToIsoString(new Date()),
      dateToIsoString(new Date())
    ]
  );
}
```

### 4. Field Mapping (snake_case ↔ camelCase)

```typescript
import { rowToEntity, entityToRow } from '@/utils/fieldMapping';
import { TABLES } from '@/db';
import type { Patient } from '@/types/patient';

// Query returns snake_case
const row = await powerSync.get(
  `SELECT * FROM ${TABLES.PATIENTS} WHERE id = ?`,
  [patientId]
);

// Convert to camelCase TypeScript object
const patient: Patient = rowToEntity<Patient>(row);
console.log(patient.firstName); // ✅ camelCase

// Convert back for database
const dbRow = entityToRow(patient);
console.log(dbRow.first_name); // ✅ snake_case
```

---

## Common Patterns

### Pattern 1: Search with Filters

```typescript
import { buildSelectQuery, TABLES } from '@/db';

const { sql, params } = buildSelectQuery(
  TABLES.PATIENTS,
  ['*'],
  {
    where: [
      { field: 'status', operator: 'IN', value: ['Waiting', 'Triaged'] },
      { field: 'priority', operator: '=', value: 'Urgent' }
    ],
    orderBy: [
      { field: 'priority', direction: 'DESC' },
      { field: 'created_at', direction: 'DESC' }
    ],
    limit: 50
  }
);

const patients = await powerSync.getAll(sql, params);
```

### Pattern 2: Join Query

```typescript
// Get patients with their coordinators
const patientsWithCoordinators = await powerSync.getAll(`
  SELECT 
    p.*,
    u.first_name as coordinator_first_name,
    u.last_name as coordinator_last_name
  FROM ${TABLES.PATIENTS} p
  LEFT JOIN ${TABLES.USERS} u ON p.coordinator_id = u.id
  WHERE p.status = ?
  ORDER BY p.priority DESC
`, ['In Progress']);
```

### Pattern 3: Save UI State

```typescript
import { UI_STATE_KEYS, buildSetUiStateQuery } from '@/db';

// Save filters
const { sql, params } = buildSetUiStateQuery(
  UI_STATE_KEYS.PATIENT_FILTERS,
  { status: ['Waiting'], priority: 'Urgent' }
);
await powerSync.execute(sql, params);

// Load filters
const { sql: getSql, params: getParams } = buildGetUiStateQuery(
  UI_STATE_KEYS.PATIENT_FILTERS
);
const result = await powerSync.get(getSql, getParams);
const filters = parseJsonField(result?.value, {});
```

### Pattern 4: Handle JSON Fields

```typescript
import { parseJsonField, stringifyJsonField } from '@/db';

// Parse JSON from database
const specialties = parseJsonField<string[]>(patient.specialties, []);

// Stringify for storage
const stored = stringifyJsonField(['Cardiology', 'Surgery']);
await powerSync.execute(
  `UPDATE ${TABLES.PATIENTS} SET specialties = ? WHERE id = ?`,
  [stored, patientId]
);
```

### Pattern 5: Batch Operations

```typescript
import { buildBatchInsertQuery, TABLES } from '@/db';

const patients = [
  { id: generateId(), first_name: 'John', last_name: 'Doe', ... },
  { id: generateId(), first_name: 'Jane', last_name: 'Smith', ... }
];

const queries = buildBatchInsertQuery(TABLES.PATIENTS, patients);

await powerSync.writeTransaction(async (tx) => {
  for (const { sql, params } of queries) {
    await tx.execute(sql, params);
  }
});
```

---

## Helper Functions Cheat Sheet

### Query Builders
```typescript
buildSelectQuery(table, columns, options)
buildWhereClause(conditions)
buildOrderByClause(orderBy)
buildLimitClause(limit, offset)
```

### Type Conversions
```typescript
parseJsonField(value, defaultValue)     // JSON → Object
stringifyJsonField(value)               // Object → JSON
boolToInt(value)                        // Boolean → 0/1
intToBool(value)                        // 0/1 → Boolean
dateToIsoString(date)                   // Date → ISO string
isoStringToDate(isoString)              // ISO string → Date
```

### UUID
```typescript
generateId()                            // Generate UUID v4
isValidUuid(uuid)                       // Validate UUID
```

### Common Queries
```typescript
buildGetPatientByIdQuery(patientId)
buildGetPatientsByStatusQuery(status, limit)
buildGetNotesForPatientQuery(patientId, includeAuthor)
buildSearchPatientsQuery(searchTerm, limit)
```

---

## Table Constants

Use `TABLES` constant for type-safe table names:

```typescript
import { TABLES } from '@/db';

TABLES.PATIENTS                          // 'patients'
TABLES.USERS                             // 'users'
TABLES.NOTES                             // 'notes'
TABLES.VISITS                            // 'visits'
TABLES.INTERNAL_MESSAGE_THREADS          // 'internal_message_threads'
TABLES.TELEGRAM_THREADS                  // 'telegram_threads'
TABLES.NOTIFICATIONS                     // 'notifications'
TABLES.RX_ORDERS                         // 'rx_orders'
TABLES.MED_EVAC_PATIENTS                 // 'med_evac_patients'
TABLES.UI_STATE                          // 'ui_state'
TABLES.OFFLINE_QUEUE                     // 'offline_queue'
TABLES.SYNC_METADATA                     // 'sync_metadata'
```

---

## Key Concepts

### 1. Snake_case vs camelCase
- **Database fields**: `first_name`, `created_at` (snake_case)
- **TypeScript**: `firstName`, `createdAt` (camelCase)
- **Always use field mapping utilities to convert!**

### 2. JSON Storage
- Arrays and objects are stored as JSON strings
- Always parse when reading: `parseJsonField(value, defaultValue)`
- Always stringify when writing: `stringifyJsonField(value)`

### 3. Boolean Storage
- SQLite uses 0/1 for booleans
- Use `boolToInt()` when writing
- Use `intToBool()` when reading

### 4. Timestamps
- Stored as ISO 8601 strings: "2024-12-07T10:30:00.000Z"
- Use `dateToIsoString()` when writing
- Use `isoStringToDate()` when reading

### 5. UUIDs
- All primary keys are UUIDs stored as TEXT
- Use `generateId()` for new records
- Use `isValidUuid()` to validate

---

## Real-World Example

Complete example of a patient search screen:

```typescript
import React, { useState } from 'react';
import { usePowerSyncWatchedQuery } from '@powersync/react-native';
import { TABLES, buildSelectQuery } from '@/db';
import { rowToEntity } from '@/utils/fieldMapping';
import type { Patient } from '@/types/patient';

function PatientSearchScreen() {
  const [filters, setFilters] = useState({
    status: ['Waiting', 'Triaged'],
    priority: 'Urgent'
  });

  // Build query from filters
  const { sql, params } = buildSelectQuery(
    TABLES.PATIENTS,
    ['*'],
    {
      where: [
        { field: 'status', operator: 'IN', value: filters.status },
        { field: 'priority', operator: '=', value: filters.priority }
      ],
      orderBy: [
        { field: 'priority', direction: 'DESC' },
        { field: 'created_at', direction: 'DESC' }
      ],
      limit: 100
    }
  );

  // Watch query - auto-updates!
  const { data: rows, isLoading, error } = usePowerSyncWatchedQuery(sql, params);

  // Convert to typed objects
  const patients: Patient[] = (rows || []).map(row => rowToEntity<Patient>(row));

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <FilterBar filters={filters} onChange={setFilters} />
      <PatientList patients={patients} />
    </View>
  );
}
```

---

## Tips & Best Practices

✅ **DO:**
- Use `TABLES` constants for table names
- Use helper functions for type conversions
- Use field mapping for snake_case ↔ camelCase
- Use watched queries for real-time updates
- Handle JSON fields with parse/stringify
- Validate UUIDs before querying
- Use indexes (filter on indexed columns)

❌ **DON'T:**
- Access snake_case fields directly in TypeScript
- Forget to parse JSON fields
- Store booleans as true/false (use 0/1)
- Store dates as Date objects (use ISO strings)
- Hard-code table names (use TABLES constants)
- Use `SELECT *` in production (select only needed columns)

---

## Troubleshooting

### Issue: Query returns empty results
**Solution:** Check if data is synced. Query `sync_metadata` table:
```typescript
const metadata = await powerSync.get(
  `SELECT * FROM ${TABLES.SYNC_METADATA} WHERE table_name = ?`,
  [TABLES.PATIENTS]
);
console.log('Last sync:', metadata?.last_sync_at);
```

### Issue: Field mapping errors
**Solution:** Ensure all fields are mapped in `src/utils/fieldMapping/config.ts`

### Issue: JSON parse errors
**Solution:** Always provide default values:
```typescript
const data = parseJsonField(value, []); // ✅ Safe with default
```

---

## Next Steps

1. **Read Full Documentation**: `src/db/README.md`
2. **View Schema Diagram**: `src/db/SCHEMA_DIAGRAM.md`
3. **Check Implementation**: `src/db/powerSyncSchema.ts`
4. **Study Examples**: Phase 3.2 API services

---

## Support

- 📖 Full Docs: `src/db/README.md`
- 🗺️ Schema Diagram: `src/db/SCHEMA_DIAGRAM.md`
- 🔧 Helper Reference: `src/db/helpers.ts`
- 📋 Migration Plan: `docs/sql-transtion/SQL_MOBILE_TRANSITION.md`

**Happy coding! 🚀**