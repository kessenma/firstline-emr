// apps/mobile/src/utils/examples/fieldMappingExample.ts
// Before/After examples showing how to refactor code to use field mapping utilities

import { Patient } from '../../types/patient';
import {
  PatientRow,
  rowToEntity,
  entityToRow,
  buildWhereClause,
  buildOrderByClause,
  rowsToEntities,
} from '../fieldMapping';

// ============================================================================
// EXAMPLE 1: PowerSync Query - BEFORE (Manual Mapping)
// ============================================================================

async function fetchPatientsOld_BEFORE(powerSync: any, doctorId: string) {
  // ❌ Problem 1: Mixing camelCase and snake_case
  const results = await powerSync.execute(
    'SELECT * FROM patients WHERE doctorId = ?', // Wrong! Field is doctor_id in DB
    [doctorId],
  );

  // ❌ Problem 2: Manual field mapping - error-prone and tedious
  const patients = results.map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    chiefComplaint: row.chief_complaint,
    status: row.status,
    priority: row.priority,
    triagedById: row.triaged_by_id,
    doctorId: row.doctor_id,
    coordinatorId: row.coordinator_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Easy to forget fields or make typos!
  }));

  return patients;
}

// ✅ AFTER: Using field mapping utilities
async function fetchPatientsNew_AFTER(powerSync: any, doctorId: string) {
  // ✅ Use snake_case in SQL (correct!)
  const rows = (await powerSync.execute(
    'SELECT * FROM patients WHERE doctor_id = ?',
    [doctorId],
  )) as PatientRow[];

  // ✅ Automatic conversion from snake_case to camelCase
  const patients = rowsToEntities(rows) as Patient[];

  return patients;
}

// ============================================================================
// EXAMPLE 2: Creating a Patient - BEFORE (Manual Mapping)
// ============================================================================

async function createPatientOld_BEFORE(
  powerSync: any,
  patient: Omit<Patient, 'id'>,
) {
  // ❌ Problem: Manually converting each field to snake_case
  await powerSync.execute(
    `INSERT INTO patients (
      first_name,
      last_name,
      date_of_birth,
      gender,
      chief_complaint,
      status,
      priority,
      doctor_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      patient.firstName,
      patient.lastName,
      patient.dob, // ❌ Inconsistent naming! Should be dateOfBirth
      patient.gender,
      patient.chiefComplaint,
      patient.status,
      patient.priority,
      patient.doctor_id, // ❌ Mixed naming! TypeScript uses doctorId
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  );
}

// ✅ AFTER: Using field mapping utilities
async function createPatientNew_AFTER(
  powerSync: any,
  patient: Omit<Patient, 'id'>,
) {
  // ✅ Convert TypeScript entity (camelCase) to database row (snake_case)
  const dbRow = entityToRow(patient);

  const fields = Object.keys(dbRow).join(', ');
  const placeholders = Object.keys(dbRow)
    .map(() => '?')
    .join(', ');
  const values = Object.values(dbRow);

  await powerSync.execute(
    `INSERT INTO patients (${fields}) VALUES (${placeholders})`,
    values,
  );
}

// ============================================================================
// EXAMPLE 3: Updating a Patient - BEFORE (Manual Mapping)
// ============================================================================

async function updatePatientOld_BEFORE(
  powerSync: any,
  patientId: string,
  updates: Partial<Patient>,
) {
  // ❌ Problem: Manually building SET clause with snake_case
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.firstName) {
    setClauses.push('first_name = ?');
    values.push(updates.firstName);
  }
  if (updates.lastName) {
    setClauses.push('last_name = ?');
    values.push(updates.lastName);
  }
  if (updates.dob) {
    setClauses.push('date_of_birth = ?');
    values.push(updates.dob);
  }
  if (updates.chiefComplaint) {
    setClauses.push('chief_complaint = ?');
    values.push(updates.chiefComplaint);
  }
  // ... this gets tedious for 20+ fields!

  values.push(patientId);

  await powerSync.execute(
    `UPDATE patients SET ${setClauses.join(
      ', ',
    )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values,
  );
}

// ✅ AFTER: Using field mapping utilities
async function updatePatientNew_AFTER(
  powerSync: any,
  patientId: string,
  updates: Partial<Patient>,
) {
  // ✅ Automatic conversion to snake_case
  const dbUpdates = entityToRow(updates);

  const setClause = Object.keys(dbUpdates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(dbUpdates);

  await powerSync.execute(
    `UPDATE patients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, patientId],
  );
}

// ============================================================================
// EXAMPLE 4: Search with Filters - BEFORE (Manual Mapping)
// ============================================================================

async function searchPatientsOld_BEFORE(
  powerSync: any,
  filters: { status?: string; priority?: string; doctorId?: string },
) {
  // ❌ Problem: Manually building WHERE clause
  const whereClauses: string[] = [];
  const values: any[] = [];

  if (filters.status) {
    whereClauses.push('status = ?');
    values.push(filters.status);
  }
  if (filters.priority) {
    whereClauses.push('priority = ?');
    values.push(filters.priority);
  }
  if (filters.doctorId) {
    whereClauses.push('doctor_id = ?'); // ❌ Easy to forget conversion!
    values.push(filters.doctorId);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const results = await powerSync.execute(
    `SELECT * FROM patients ${whereClause}`,
    values,
  );

  // ❌ Manual conversion back to camelCase
  return results.map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    // ... tedious mapping again
  }));
}

// ✅ AFTER: Using field mapping utilities
async function searchPatientsNew_AFTER(
  powerSync: any,
  filters: { status?: string; priority?: string; doctorId?: string },
) {
  // ✅ Automatic WHERE clause building with snake_case conversion
  const { clause, params } = buildWhereClause(filters);

  const whereClause = clause ? `WHERE ${clause}` : '';

  const rows = (await powerSync.execute(
    `SELECT * FROM patients ${whereClause}`,
    params,
  )) as PatientRow[];

  // ✅ Automatic conversion to camelCase
  return rowsToEntities(rows) as Patient[];
}

// ============================================================================
// EXAMPLE 5: Complex Query with Joins - BEFORE (Manual Mapping)
// ============================================================================

async function fetchPatientsWithDoctorsOld_BEFORE(powerSync: any) {
  const results = await powerSync.execute(`
    SELECT
      p.id,
      p.first_name as patient_first_name,
      p.last_name as patient_last_name,
      p.date_of_birth,
      p.status,
      p.priority,
      d.id as doctor_id,
      d.first_name as doctor_first_name,
      d.last_name as doctor_last_name,
      d.email as doctor_email
    FROM patients p
    LEFT JOIN users d ON p.doctor_id = d.id
  `);

  // ❌ Problem: Complex manual mapping for nested objects
  return results.map((row: any) => ({
    id: row.id,
    firstName: row.patient_first_name,
    lastName: row.patient_last_name,
    dateOfBirth: row.date_of_birth,
    status: row.status,
    priority: row.priority,
    doctor: row.doctor_id
      ? {
          id: row.doctor_id,
          firstName: row.doctor_first_name,
          lastName: row.doctor_last_name,
          email: row.doctor_email,
        }
      : undefined,
  }));
}

// ✅ AFTER: Using field mapping utilities
async function fetchPatientsWithDoctorsNew_AFTER(powerSync: any) {
  const results = await powerSync.execute(`
    SELECT
      p.*,
      d.id as doctor__id,
      d.first_name as doctor__first_name,
      d.last_name as doctor__last_name,
      d.email as doctor__email
    FROM patients p
    LEFT JOIN users d ON p.doctor_id = d.id
  `);

  // ✅ Use helper to convert and restructure
  return results.map((row: any) => {
    const patient = rowToEntity(row) as Patient;

    // Extract nested doctor object (fields prefixed with doctor__)
    if (row.doctor__id) {
      const doctorFields: any = {};
      Object.keys(row).forEach(key => {
        if (key.startsWith('doctor__')) {
          const fieldName = key.replace('doctor__', '');
          doctorFields[fieldName] = row[key];
        }
      });
      patient.doctor = rowToEntity(doctorFields) as any;
    }

    return patient;
  });
}

// ============================================================================
// EXAMPLE 6: Sorting and Pagination - BEFORE (Manual Mapping)
// ============================================================================

async function fetchPatientsPaginatedOld_BEFORE(
  powerSync: any,
  page: number,
  limit: number,
  sortBy: string,
  sortDirection: 'ASC' | 'DESC',
) {
  // ❌ Problem: Need to manually convert sortBy to snake_case
  let dbSortField = sortBy;
  if (sortBy === 'firstName') dbSortField = 'first_name';
  if (sortBy === 'lastName') dbSortField = 'last_name';
  if (sortBy === 'dateOfBirth') dbSortField = 'date_of_birth';
  if (sortBy === 'createdAt') dbSortField = 'created_at';
  // ... this gets repetitive

  const offset = (page - 1) * limit;

  const results = await powerSync.execute(
    `SELECT * FROM patients ORDER BY ${dbSortField} ${sortDirection} LIMIT ? OFFSET ?`,
    [limit, offset],
  );

  return results.map((_row: any) => ({
    // ❌ Manual mapping again...
  }));
}

// ✅ AFTER: Using field mapping utilities
async function fetchPatientsPaginatedNew_AFTER(
  powerSync: any,
  page: number,
  limit: number,
  sortBy: string,
  sortDirection: 'ASC' | 'DESC',
) {
  // ✅ Automatic field name conversion
  const orderBy = buildOrderByClause({
    field: sortBy,
    direction: sortDirection,
  });
  const offset = (page - 1) * limit;

  const rows = (await powerSync.execute(
    `SELECT * FROM patients ${orderBy} LIMIT ? OFFSET ?`,
    [limit, offset],
  )) as PatientRow[];

  // ✅ Automatic conversion to camelCase
  return rowsToEntities(rows) as Patient[];
}

// ============================================================================
// EXAMPLE 7: Batch Operations - BEFORE (Manual Mapping)
// ============================================================================

async function batchUpdatePatientsOld_BEFORE(
  powerSync: any,
  patientIds: string[],
  updates: Partial<Patient>,
) {
  // ❌ Problem: Manual field conversion for each update
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.status) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.priority) {
    setClauses.push('priority = ?');
    values.push(updates.priority);
  }
  // ... manual field by field

  const placeholders = patientIds.map(() => '?').join(', ');
  values.push(...patientIds);

  await powerSync.execute(
    `UPDATE patients SET ${setClauses.join(
      ', ',
    )} WHERE id IN (${placeholders})`,
    values,
  );
}

// ✅ AFTER: Using field mapping utilities
async function batchUpdatePatientsNew_AFTER(
  powerSync: any,
  patientIds: string[],
  updates: Partial<Patient>,
) {
  // ✅ Automatic conversion
  const dbUpdates = entityToRow(updates);

  const setClause = Object.keys(dbUpdates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(dbUpdates);

  const placeholders = patientIds.map(() => '?').join(', ');

  await powerSync.execute(
    `UPDATE patients SET ${setClause} WHERE id IN (${placeholders})`,
    [...values, ...patientIds],
  );
}

// ============================================================================
// KEY BENEFITS OF USING FIELD MAPPING UTILITIES
// ============================================================================

/*
 * 1. ✅ Consistent naming: TypeScript uses camelCase, SQL uses snake_case
 * 2. ✅ Less error-prone: No manual field-by-field mapping
 * 3. ✅ Maintainable: Add new fields without updating mapping code
 * 4. ✅ Type-safe: TypeScript catches errors at compile time
 * 5. ✅ DRY: Don't repeat field mappings throughout codebase
 * 6. ✅ PowerSync compatible: Ensures queries use correct field names
 * 7. ✅ Easy refactoring: Change field names in one place
 * 8. ✅ Testable: Validation utilities catch naming issues
 */

// Export examples for reference
export {
  fetchPatientsOld_BEFORE,
  fetchPatientsNew_AFTER,
  createPatientOld_BEFORE,
  createPatientNew_AFTER,
  updatePatientOld_BEFORE,
  updatePatientNew_AFTER,
  searchPatientsOld_BEFORE,
  searchPatientsNew_AFTER,
  fetchPatientsWithDoctorsOld_BEFORE,
  fetchPatientsWithDoctorsNew_AFTER,
  fetchPatientsPaginatedOld_BEFORE,
  fetchPatientsPaginatedNew_AFTER,
  batchUpdatePatientsOld_BEFORE,
  batchUpdatePatientsNew_AFTER,
};
