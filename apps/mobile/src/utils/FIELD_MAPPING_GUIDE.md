# Field Mapping Utilities Guide

## Overview

This guide explains how to use the field mapping utilities to handle the conversion between:
- **TypeScript interfaces** (camelCase) - Used in application code
- **Database rows** (snake_case) - Used in PostgreSQL/PowerSync queries

## Core Principle

> **Keep camelCase in TypeScript, snake_case in Database**

- Application code uses **camelCase** for better JavaScript/TypeScript ergonomics
- Database (PostgreSQL) uses **snake_case** following SQL conventions
- PowerSync queries must use **snake_case** field names
- Utilities handle automatic conversion between the two formats

---

## Part 1: Basic Case Conversion

### Convert Individual Strings

```typescript
import { camelToSnake, snakeToCamel } from './fieldMapping';

// camelCase → snake_case
camelToSnake('firstName');      // → 'first_name'
camelToSnake('dateOfBirth');    // → 'date_of_birth'
camelToSnake('triagedById');    // → 'triaged_by_id'

// snake_case → camelCase
snakeToCamel('first_name');     // → 'firstName'
snakeToCamel('date_of_birth');  // → 'dateOfBirth'
snakeToCamel('triaged_by_id');  // → 'triagedById'
```

---

## Part 2: Object Key Conversion

### Convert Object Keys for Database

```typescript
import { keysToSnakeCase, keysToCamelCase } from './fieldMapping';

// TypeScript entity → Database row
const patient = {
  id: 'uuid-123',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
  chiefComplaint: 'Chest pain',
  triagedById: 'uuid-456',
  createdAt: '2024-01-01T00:00:00Z',
};

const dbRow = keysToSnakeCase(patient);
// Result:
// {
//   id: 'uuid-123',
//   first_name: 'John',
//   last_name: 'Doe',
//   date_of_birth: '1990-01-01',
//   chief_complaint: 'Chest pain',
//   triaged_by_id: 'uuid-456',
//   created_at: '2024-01-01T00:00:00Z',
// }
```

### Convert Database Row to TypeScript Entity

```typescript
// Database row → TypeScript entity
const dbRow = {
  id: 'uuid-123',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1990-01-01',
  chief_complaint: 'Chest pain',
  triaged_by_id: 'uuid-456',
  created_at: '2024-01-01T00:00:00Z',
};

const entity = keysToCamelCase(dbRow);
// Result:
// {
//   id: 'uuid-123',
//   firstName: 'John',
//   lastName: 'Doe',
//   dateOfBirth: '1990-01-01',
//   chiefComplaint: 'Chest pain',
//   triagedById: 'uuid-456',
//   createdAt: '2024-01-01T00:00:00Z',
// }
```

---

## Part 3: Type-Safe Conversions

### Using Database Row Types

```typescript
import { PatientRow, UserRow, MessageRow, rowToEntity, entityToRow } from './fieldMapping';
import { Patient, User, Message } from '../types/patient';

// PowerSync query returns snake_case database rows
const patientRows: PatientRow[] = await powerSync.execute(
  'SELECT * FROM patients WHERE doctor_id = ?',
  [doctorId]
);

// Convert to TypeScript entities (camelCase)
const patients: Patient[] = patientRows.map(row => rowToEntity(row) as Patient);

// When saving/updating, convert back to database format
const updatedPatient: Patient = {
  id: 'uuid-123',
  firstName: 'Jane',
  lastName: 'Smith',
  // ... more camelCase fields
};

const rowToSave = entityToRow(updatedPatient);
// Now rowToSave has snake_case keys for database
```

---

## Part 4: PowerSync Query Helpers

### Building WHERE Clauses

```typescript
import { buildWhereClause } from './fieldMapping';

// Use camelCase in your TypeScript code
const filters = {
  status: 'Active',
  priority: 'High',
  doctorId: 'uuid-123',
};

const { clause, params } = buildWhereClause(filters);
// clause: 'status = ? AND priority = ? AND doctor_id = ?'
// params: ['Active', 'High', 'uuid-123']

// Use in PowerSync query
const query = `SELECT * FROM patients WHERE ${clause}`;
const results = await powerSync.execute(query, params);
```

### Building SELECT Fields

```typescript
import { buildSelectFields } from './fieldMapping';

// Specify fields in camelCase
const fields = ['id', 'firstName', 'lastName', 'dateOfBirth', 'status'];

const selectClause = buildSelectFields(fields);
// Result: 'id, first_name, last_name, date_of_birth, status'

// Use in query
const query = `SELECT ${selectClause} FROM patients`;
```

### Building ORDER BY Clauses

```typescript
import { buildOrderByClause } from './fieldMapping';

const orderBy = { field: 'createdAt', direction: 'DESC' as const };

const orderClause = buildOrderByClause(orderBy);
// Result: 'ORDER BY created_at DESC'

// Use in query
const query = `SELECT * FROM patients ${orderClause}`;
```

---

## Part 5: Complete PowerSync Integration Example

### Custom Hook with Field Mapping

```typescript
// hooks/usePatients.ts
import { useState, useEffect } from 'react';
import { usePowerSync } from '@powersync/react-native';
import { PatientRow, rowsToEntities } from '../utils/fieldMapping';
import { Patient } from '../types/patient';

export function usePatients(doctorId: string) {
  const powerSync = usePowerSync();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // PowerSync query uses snake_case
        const rows = await powerSync.execute<PatientRow>(
          `SELECT 
            id, 
            first_name, 
            last_name, 
            date_of_birth, 
            status, 
            priority,
            doctor_id,
            created_at
          FROM patients 
          WHERE doctor_id = ? 
          ORDER BY created_at DESC`,
          [doctorId]
        );

        // Convert database rows (snake_case) to TypeScript entities (camelCase)
        const entities = rowsToEntities(rows) as Patient[];
        setPatients(entities);
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [doctorId, powerSync]);

  return { patients, loading };
}
```

### Creating/Updating Records

```typescript
// services/PatientService.ts
import { usePowerSync } from '@powersync/react-native';
import { Patient } from '../types/patient';
import { entityToRow, buildWhereClause } from '../utils/fieldMapping';

export async function updatePatient(
  powerSync: any,
  patientId: string,
  updates: Partial<Patient>
) {
  // Convert TypeScript entity (camelCase) to database format (snake_case)
  const dbUpdates = entityToRow(updates);

  // Build UPDATE query with snake_case fields
  const setClause = Object.keys(dbUpdates)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = Object.values(dbUpdates);

  await powerSync.execute(
    `UPDATE patients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, patientId]
  );
}

export async function createPatient(
  powerSync: any,
  patient: Omit<Patient, 'id'>
) {
  // Convert to database format
  const dbRow = entityToRow(patient);
  
  const fields = Object.keys(dbRow).join(', ');
  const placeholders = Object.keys(dbRow).map(() => '?').join(', ');
  const values = Object.values(dbRow);

  await powerSync.execute(
    `INSERT INTO patients (${fields}) VALUES (${placeholders})`,
    values
  );
}

export async function searchPatients(
  powerSync: any,
  filters: Partial<Patient>
) {
  // Use camelCase in filters, buildWhereClause converts to snake_case
  const { clause, params } = buildWhereClause(filters);

  const query = `SELECT * FROM patients WHERE ${clause}`;
  const rows = await powerSync.execute(query, params);
  
  // Convert results back to camelCase
  return rowsToEntities(rows) as Patient[];
}
```

---

## Part 6: Validation

### Validate Round-Trip Conversion

```typescript
import { testCaseConversion } from './fieldMapping';

const patient = {
  id: 'uuid-123',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
};

const result = testCaseConversion(patient);

if (!result.success) {
  console.error('Conversion errors:', result.errors);
  console.log('Original:', result.original);
  console.log('After round-trip:', result.converted);
}
```

### Validate Database Row Format

```typescript
import { validateSnakeCaseRow } from './fieldMapping';

const dbRow = {
  id: 'uuid-123',
  first_name: 'John', // ✅ Valid snake_case
  lastName: 'Doe',    // ❌ Invalid - camelCase in database!
};

const validation = validateSnakeCaseRow(dbRow);

if (!validation.valid) {
  console.error('Invalid keys found:', validation.invalidKeys);
  // Output: ['lastName']
}
```

### Validate TypeScript Entity Format

```typescript
import { validateCamelCaseEntity } from './fieldMapping';

const entity = {
  id: 'uuid-123',
  firstName: 'John',     // ✅ Valid camelCase
  last_name: 'Doe',      // ❌ Invalid - snake_case in TypeScript!
  powersync_id: 'sync1', // ✅ Exception - PowerSync metadata allowed
};

const validation = validateCamelCaseEntity(entity);

if (!validation.valid) {
  console.error('Invalid keys found:', validation.invalidKeys);
  // Output: ['last_name']
}
```

---

## Part 7: Database Row Type Reference

### Available Row Types

```typescript
import {
  UserRow,
  PatientRow,
  MessageRow,
  ThreadRow,
} from './fieldMapping';

// Use these types for PowerSync query results
const patientRow: PatientRow = {
  id: 'uuid-123',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  status: 'In Progress',
  priority: 'High',
  doctor_id: 'uuid-456',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const userRow: UserRow = {
  id: 'uuid-456',
  first_name: 'Dr. Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  account_type: 'Doctor',
  specialties: ['Cardiology'],
  created_at: '2024-01-01T00:00:00Z',
};
```

---

## Part 8: Best Practices

### ✅ DO

1. **Use camelCase in TypeScript code**
   ```typescript
   const patient: Patient = {
     firstName: 'John',
     lastName: 'Doe',
     dateOfBirth: '1990-01-01',
   };
   ```

2. **Use snake_case in PowerSync queries**
   ```typescript
   await powerSync.execute(
     'SELECT first_name, last_name FROM patients WHERE doctor_id = ?',
     [doctorId]
   );
   ```

3. **Convert at boundaries**
   ```typescript
   // Database → App
   const patients = rowsToEntities(dbRows);
   
   // App → Database
   const dbRow = entityToRow(patient);
   ```

4. **Use type-safe row types**
   ```typescript
   const rows = await powerSync.execute<PatientRow>('SELECT * FROM patients');
   ```

### ❌ DON'T

1. **Mix naming conventions**
   ```typescript
   // ❌ Bad
   const patient = {
     firstName: 'John',
     last_name: 'Doe', // Mixed!
   };
   ```

2. **Hardcode field mappings**
   ```typescript
   // ❌ Bad
   const dbRow = {
     first_name: patient.firstName,
     last_name: patient.lastName,
     // ... manual mapping
   };
   
   // ✅ Good
   const dbRow = entityToRow(patient);
   ```

3. **Use camelCase in SQL**
   ```typescript
   // ❌ Bad
   await powerSync.execute('SELECT firstName FROM patients');
   
   // ✅ Good
   await powerSync.execute('SELECT first_name FROM patients');
   ```

---

## Part 9: Migration Path

### Phase 1: Add Parallel Support
```typescript
// Support both formats temporarily
const patient = {
  // Old format (will be deprecated)
  firstName: 'John',
  
  // Can read from either
  lastName: data.lastName || data.last_name,
};
```

### Phase 2: Update Code Gradually
```typescript
// Update one component at a time to use field mapping
import { rowToEntity } from './fieldMapping';

const patients = dbRows.map(row => rowToEntity(row));
```

### Phase 3: Remove Legacy Support
```typescript
// After all code updated, remove manual mappings
// Use only automatic conversion utilities
```

---

## Part 10: Troubleshooting

### Issue: PowerSync query returns empty results

**Cause:** Using camelCase field names in WHERE clause

```typescript
// ❌ Wrong
const rows = await powerSync.execute(
  'SELECT * FROM patients WHERE doctorId = ?',
  [id]
);

// ✅ Correct
const rows = await powerSync.execute(
  'SELECT * FROM patients WHERE doctor_id = ?',
  [id]
);
```

### Issue: Data not displaying in UI

**Cause:** Not converting snake_case rows to camelCase entities

```typescript
// ❌ Wrong
const [patients, setPatients] = useState([]);
const rows = await powerSync.execute('SELECT * FROM patients');
setPatients(rows); // UI expects camelCase!

// ✅ Correct
const rows = await powerSync.execute('SELECT * FROM patients');
const entities = rowsToEntities(rows);
setPatients(entities); // Now UI gets camelCase
```

### Issue: TypeScript type errors

**Cause:** Mixing row types and entity types

```typescript
// ❌ Wrong
const patient: Patient = await powerSync.execute('SELECT * FROM patients')[0];
// Returns PatientRow (snake_case), but typed as Patient (camelCase)

// ✅ Correct
const rows = await powerSync.execute<PatientRow>('SELECT * FROM patients');
const patients: Patient[] = rows.map(row => rowToEntity(row) as Patient);
```

---

## Summary

- **TypeScript**: Use camelCase, import types from `src/types/`
- **Database**: Use snake_case, import row types from `fieldMapping.ts`
- **Conversion**: Use `rowToEntity()` and `entityToRow()` at boundaries
- **Queries**: Use query helpers like `buildWhereClause()` for automatic conversion
- **Validation**: Use test utilities to ensure proper formatting

This approach keeps your code clean, type-safe, and compatible with both TypeScript conventions and PostgreSQL/PowerSync requirements.