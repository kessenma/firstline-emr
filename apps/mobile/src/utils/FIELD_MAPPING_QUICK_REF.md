# Field Mapping Quick Reference Card

## 🚀 Quick Start

### Convert Object Keys
```typescript
import { keysToSnakeCase, keysToCamelCase } from './fieldMapping';

// TypeScript → Database
const dbRow = keysToSnakeCase({ firstName: 'John', dateOfBirth: '1990-01-01' });
// { first_name: 'John', date_of_birth: '1990-01-01' }

// Database → TypeScript
const entity = keysToCamelCase({ first_name: 'John', date_of_birth: '1990-01-01' });
// { firstName: 'John', dateOfBirth: '1990-01-01' }
```

### Type-Safe Conversion
```typescript
import { rowToEntity, entityToRow } from './fieldMapping';

// Database row → TypeScript entity
const patient = rowToEntity(dbRow);

// TypeScript entity → Database row
const dbRow = entityToRow(patient);
```

### PowerSync Query
```typescript
import { buildWhereClause, rowsToEntities } from './fieldMapping';

// Build WHERE clause
const filters = { status: 'Active', doctorId: 'uuid-123' };
const { clause, params } = buildWhereClause(filters);
// "status = ? AND doctor_id = ?"

// Execute and convert
const rows = await powerSync.execute(`SELECT * FROM patients WHERE ${clause}`, params);
const patients = rowsToEntities(rows);
```

---

## 📚 Common Patterns

### Fetch Records
```typescript
const rows = await powerSync.execute<PatientRow>(
  'SELECT * FROM patients WHERE doctor_id = ?',
  [doctorId]
);
const patients: Patient[] = rowsToEntities(rows);
```

### Create Record
```typescript
const newPatient = { firstName: 'John', lastName: 'Doe' };
const dbRow = entityToRow(newPatient);

await powerSync.execute(
  `INSERT INTO patients (${Object.keys(dbRow).join(', ')}) 
   VALUES (${Object.keys(dbRow).map(() => '?').join(', ')})`,
  Object.values(dbRow)
);
```

### Update Record
```typescript
const updates = { status: 'Completed', priority: 'Low' };
const dbUpdates = entityToRow(updates);

const setClause = Object.keys(dbUpdates).map(k => `${k} = ?`).join(', ');

await powerSync.execute(
  `UPDATE patients SET ${setClause} WHERE id = ?`,
  [...Object.values(dbUpdates), patientId]
);
```

### Search with Filters
```typescript
const filters = { status: 'Active', priority: 'High', doctorId: 'uuid-123' };
const { clause, params } = buildWhereClause(filters);

const rows = await powerSync.execute<PatientRow>(
  `SELECT * FROM patients WHERE ${clause}`,
  params
);
const results = rowsToEntities(rows);
```

---

## 🔧 All Available Functions

### String Conversion
```typescript
camelToSnake('firstName')          // → 'first_name'
snakeToCamel('first_name')         // → 'firstName'
```

### Object Key Conversion
```typescript
keysToSnakeCase(obj)               // All keys → snake_case
keysToCamelCase(obj)               // All keys → camelCase
```

### Type-Safe Conversion
```typescript
rowToEntity(row)                   // DB row → Entity
entityToRow(entity)                // Entity → DB row
rowsToEntities(rows)               // Array: DB → Entity
entitiesToRows(entities)           // Array: Entity → DB
```

### Query Helpers
```typescript
buildWhereClause(filters)          // → { clause, params }
buildSelectFields(['firstName'])   // → 'first_name'
buildOrderByClause({ field, dir }) // → 'ORDER BY created_at DESC'
```

### Validation
```typescript
testCaseConversion(obj)            // Test round-trip
validateSnakeCaseRow(row)          // Check DB format
validateCamelCaseEntity(entity)    // Check TS format
```

---

## 📋 Database Row Types

```typescript
import { PatientRow, UserRow, MessageRow, ThreadRow } from './fieldMapping';

// Use for PowerSync query results
const rows: PatientRow[] = await powerSync.execute('SELECT * FROM patients');
```

**Available Types:**
- `PatientRow` - patients table
- `UserRow` - users table  
- `MessageRow` - messages table
- `ThreadRow` - threads table

---

## ✅ Best Practices

**DO:**
- ✅ Use camelCase in TypeScript code
- ✅ Use snake_case in SQL queries
- ✅ Convert at boundaries (DB ↔ App)
- ✅ Use row types for PowerSync results

**DON'T:**
- ❌ Mix camelCase and snake_case in same object
- ❌ Manually map fields one-by-one
- ❌ Use camelCase in SQL WHERE clauses
- ❌ Skip conversion when reading from DB

---

## 🔍 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Empty query results | camelCase in WHERE | Use `buildWhereClause()` |
| Data not showing in UI | No conversion from DB | Use `rowsToEntities()` |
| TypeScript errors | Wrong type | Use `PatientRow` for DB, `Patient` for app |
| Validation errors | Mixed naming | Run `validateCamelCaseEntity()` |

---

## 📖 Full Documentation

- **Complete Guide:** `src/utils/FIELD_MAPPING_GUIDE.md`
- **Examples:** `src/utils/examples/fieldMappingExample.ts`
- **Tests:** `src/utils/__tests__/fieldMapping.test.ts`
- **Implementation:** `src/utils/fieldMapping.ts`

---

## 💡 Tips

1. **Import once:** Add to your service/hook imports
2. **Use query helpers:** Avoid manual WHERE clause building
3. **Type everything:** Use row types for compile-time safety
4. **Batch operations:** Use array variants for multiple records
5. **Validate early:** Use validation utils in development

---

**Quick Access:** `apps/mobile/src/utils/fieldMapping.ts`
