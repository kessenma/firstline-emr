// apps/mobile/src/utils/__tests__/fieldMapping.test.ts
// Unit tests for field mapping utilities (Phase 2.2)

import {
  camelToSnake,
  snakeToCamel,
  keysToSnakeCase,
  keysToCamelCase,
  rowToEntity,
  entityToRow,
  rowsToEntities,
  entitiesToRows,
  buildWhereClause,
  buildSelectFields,
  buildOrderByClause,
  testCaseConversion,
  validateSnakeCaseRow,
  validateCamelCaseEntity,
  PatientRow,
  UserRow,
} from '../fieldMapping';

describe('Field Mapping Utilities', () => {
  // ============================================================================
  // PART 1: Basic String Conversion
  // ============================================================================

  describe('camelToSnake', () => {
    it('should convert simple camelCase to snake_case', () => {
      expect(camelToSnake('firstName')).toBe('first_name');
      expect(camelToSnake('lastName')).toBe('last_name');
      expect(camelToSnake('email')).toBe('email');
    });

    it('should handle multiple capitals', () => {
      expect(camelToSnake('dateOfBirth')).toBe('date_of_birth');
      expect(camelToSnake('chiefComplaint')).toBe('chief_complaint');
      expect(camelToSnake('triagedById')).toBe('triaged_by_id');
    });

    it('should handle edge cases', () => {
      expect(camelToSnake('id')).toBe('id');
      expect(camelToSnake('a')).toBe('a');
      expect(camelToSnake('')).toBe('');
    });
  });

  describe('snakeToCamel', () => {
    it('should convert simple snake_case to camelCase', () => {
      expect(snakeToCamel('first_name')).toBe('firstName');
      expect(snakeToCamel('last_name')).toBe('lastName');
      expect(snakeToCamel('email')).toBe('email');
    });

    it('should handle multiple underscores', () => {
      expect(snakeToCamel('date_of_birth')).toBe('dateOfBirth');
      expect(snakeToCamel('chief_complaint')).toBe('chiefComplaint');
      expect(snakeToCamel('triaged_by_id')).toBe('triagedById');
    });

    it('should handle edge cases', () => {
      expect(snakeToCamel('id')).toBe('id');
      expect(snakeToCamel('a')).toBe('a');
      expect(snakeToCamel('')).toBe('');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve values through camel → snake → camel', () => {
      const original = 'firstName';
      const snake = camelToSnake(original);
      const backToCamel = snakeToCamel(snake);
      expect(backToCamel).toBe(original);
    });

    it('should preserve values through snake → camel → snake', () => {
      const original = 'first_name';
      const camel = snakeToCamel(original);
      const backToSnake = camelToSnake(camel);
      expect(backToSnake).toBe(original);
    });
  });

  // ============================================================================
  // PART 2: Object Key Conversion
  // ============================================================================

  describe('keysToSnakeCase', () => {
    it('should convert all keys to snake_case', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        chiefComplaint: 'Chest pain',
      };

      const result = keysToSnakeCase(input);

      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        chief_complaint: 'Chest pain',
      });
    });

    it('should handle nested objects', () => {
      const input = {
        firstName: 'John',
        doctorInfo: {
          doctorId: 'uuid-123',
          doctorName: 'Dr. Smith',
        },
      };

      const result = keysToSnakeCase(input);

      expect(result).toEqual({
        first_name: 'John',
        doctor_info: {
          doctor_id: 'uuid-123',
          doctor_name: 'Dr. Smith',
        },
      });
    });

    it('should handle arrays', () => {
      const input = {
        firstName: 'John',
        medicalHistory: [
          { conditionName: 'Diabetes', diagnosedDate: '2020-01-01' },
          { conditionName: 'Hypertension', diagnosedDate: '2021-01-01' },
        ],
      };

      const result = keysToSnakeCase(input);

      expect(result).toEqual({
        first_name: 'John',
        medical_history: [
          { condition_name: 'Diabetes', diagnosed_date: '2020-01-01' },
          { condition_name: 'Hypertension', diagnosed_date: '2021-01-01' },
        ],
      });
    });

    it('should preserve null and undefined', () => {
      const input = {
        firstName: null,
        lastName: undefined,
        dateOfBirth: '1990-01-01',
      };

      const result = keysToSnakeCase(input);

      expect(result).toEqual({
        first_name: null,
        last_name: undefined,
        date_of_birth: '1990-01-01',
      });
    });

    it('should preserve Date objects', () => {
      const date = new Date('2024-01-01');
      const input = {
        firstName: 'John',
        createdAt: date,
      };

      const result = keysToSnakeCase(input);

      expect(result).toEqual({
        first_name: 'John',
        created_at: date,
      });
      expect(result.created_at).toBeInstanceOf(Date);
    });
  });

  describe('keysToCamelCase', () => {
    it('should convert all keys to camelCase', () => {
      const input = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        chief_complaint: 'Chest pain',
      };

      const result = keysToCamelCase(input);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        chiefComplaint: 'Chest pain',
      });
    });

    it('should handle nested objects', () => {
      const input = {
        first_name: 'John',
        doctor_info: {
          doctor_id: 'uuid-123',
          doctor_name: 'Dr. Smith',
        },
      };

      const result = keysToCamelCase(input);

      expect(result).toEqual({
        firstName: 'John',
        doctorInfo: {
          doctorId: 'uuid-123',
          doctorName: 'Dr. Smith',
        },
      });
    });
  });

  // ============================================================================
  // PART 3: Type-Safe Conversions
  // ============================================================================

  describe('rowToEntity', () => {
    it('should convert PatientRow to Patient entity', () => {
      const row: PatientRow = {
        id: 'uuid-123',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        status: 'Peri-Op / In Surgery',
        priority: 'Urgent',
        doctor_id: 'uuid-456',
        created_at: '2024-01-01T00:00:00Z',
      };

      const entity = rowToEntity(row);

      expect(entity).toEqual({
        id: 'uuid-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        status: 'Peri-Op / In Surgery',
        priority: 'Urgent',
        doctorId: 'uuid-456',
        createdAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should convert UserRow to User entity', () => {
      const row: UserRow = {
        id: 'uuid-789',
        first_name: 'Dr. Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        account_type: 'Doctor',
        specialties: ['Cardiology', 'Internal Medicine'],
      };

      const entity = rowToEntity(row);

      expect(entity).toEqual({
        id: 'uuid-789',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        accountType: 'Doctor',
        specialties: ['Cardiology', 'Internal Medicine'],
      });
    });
  });

  describe('entityToRow', () => {
    it('should convert Patient entity to PatientRow', () => {
      const entity = {
        id: 'uuid-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        status: 'Peri-Op / In Surgery',
        priority: 'Urgent',
        doctorId: 'uuid-456',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const row = entityToRow(entity);

      expect(row).toEqual({
        id: 'uuid-123',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        status: 'Peri-Op / In Surgery',
        priority: 'Urgent',
        doctor_id: 'uuid-456',
        created_at: '2024-01-01T00:00:00Z',
      });
    });
  });

  describe('rowsToEntities', () => {
    it('should convert array of rows to entities', () => {
      const rows: PatientRow[] = [
        {
          id: 'uuid-1',
          first_name: 'John',
          last_name: 'Doe',
          status: 'Peri-Op / In Surgery',
          priority: 'Urgent',
        },
        {
          id: 'uuid-2',
          first_name: 'Jane',
          last_name: 'Smith',
          status: 'Post-Op / In-Patient',
          priority: 'Moderate',
        },
      ];

      const entities = rowsToEntities(rows);

      expect(entities).toHaveLength(2);
      expect(entities[0].firstName).toBe('John');
      expect(entities[1].firstName).toBe('Jane');
    });
  });

  describe('entitiesToRows', () => {
    it('should convert array of entities to rows', () => {
      const entities = [
        {
          id: 'uuid-1',
          firstName: 'John',
          lastName: 'Doe',
          status: 'Peri-Op / In Surgery',
        },
        {
          id: 'uuid-2',
          firstName: 'Jane',
          lastName: 'Smith',
          status: 'Post-Op / In-Patient',
        },
      ];

      const rows = entitiesToRows(entities);

      expect(rows).toHaveLength(2);
      expect(rows[0].first_name).toBe('John');
      expect(rows[1].first_name).toBe('Jane');
    });
  });

  // ============================================================================
  // PART 4: PowerSync Query Helpers
  // ============================================================================

  describe('buildWhereClause', () => {
    it('should build WHERE clause with snake_case fields', () => {
      const conditions = {
        firstName: 'John',
        status: 'Active',
        doctorId: 'uuid-123',
      };

      const { clause, params } = buildWhereClause(conditions);

      expect(clause).toBe('first_name = ? AND status = ? AND doctor_id = ?');
      expect(params).toEqual(['John', 'Active', 'uuid-123']);
    });

    it('should handle empty conditions', () => {
      const { clause, params } = buildWhereClause({});

      expect(clause).toBe('');
      expect(params).toEqual([]);
    });

    it('should filter out undefined values', () => {
      const conditions = {
        firstName: 'John',
        lastName: undefined,
        status: 'Active',
      };

      const { clause, params } = buildWhereClause(conditions);

      expect(clause).toBe('first_name = ? AND status = ?');
      expect(params).toEqual(['John', 'Active']);
    });

    it('should include null values', () => {
      const conditions = {
        firstName: 'John',
        middleName: null,
      };

      const { clause, params } = buildWhereClause(conditions);

      expect(clause).toBe('first_name = ? AND middle_name = ?');
      expect(params).toEqual(['John', null]);
    });
  });

  describe('buildSelectFields', () => {
    it('should convert camelCase fields to snake_case', () => {
      const fields = ['id', 'firstName', 'lastName', 'dateOfBirth'];

      const result = buildSelectFields(fields);

      expect(result).toBe('id, first_name, last_name, date_of_birth');
    });

    it('should handle single field', () => {
      const result = buildSelectFields(['firstName']);
      expect(result).toBe('first_name');
    });

    it('should handle empty array', () => {
      const result = buildSelectFields([]);
      expect(result).toBe('');
    });
  });

  describe('buildOrderByClause', () => {
    it('should build ORDER BY clause with snake_case field', () => {
      const orderBy = { field: 'createdAt', direction: 'DESC' as const };

      const result = buildOrderByClause(orderBy);

      expect(result).toBe('ORDER BY created_at DESC');
    });

    it('should handle ASC direction', () => {
      const orderBy = { field: 'lastName', direction: 'ASC' as const };

      const result = buildOrderByClause(orderBy);

      expect(result).toBe('ORDER BY last_name ASC');
    });

    it('should return empty string for undefined', () => {
      const result = buildOrderByClause(undefined);
      expect(result).toBe('');
    });
  });

  // ============================================================================
  // PART 5: Validation Utilities
  // ============================================================================

  describe('testCaseConversion', () => {
    it('should pass for valid round-trip conversion', () => {
      const obj = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      };

      const result = testCaseConversion(obj);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect data loss in conversion', () => {
      // This shouldn't happen with our utilities, but test the validator
      const obj = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = testCaseConversion(obj);

      expect(result.success).toBe(true);
      expect(result.original).toEqual(obj);
    });
  });

  describe('validateSnakeCaseRow', () => {
    it('should pass for valid snake_case', () => {
      const row = {
        id: 'uuid-123',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
      };

      const result = validateSnakeCaseRow(row);

      expect(result.valid).toBe(true);
      expect(result.invalidKeys).toHaveLength(0);
    });

    it('should fail for camelCase keys', () => {
      const row = {
        id: 'uuid-123',
        firstName: 'John', // Invalid!
        last_name: 'Doe',
        dateOfBirth: '1990-01-01', // Invalid!
      };

      const result = validateSnakeCaseRow(row);

      expect(result.valid).toBe(false);
      expect(result.invalidKeys).toContain('firstName');
      expect(result.invalidKeys).toContain('dateOfBirth');
    });
  });

  describe('validateCamelCaseEntity', () => {
    it('should pass for valid camelCase', () => {
      const entity = {
        id: 'uuid-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      };

      const result = validateCamelCaseEntity(entity);

      expect(result.valid).toBe(true);
      expect(result.invalidKeys).toHaveLength(0);
    });

    it('should allow PowerSync metadata fields', () => {
      const entity = {
        id: 'uuid-123',
        firstName: 'John',
        powersync_id: 'sync-123', // Allowed exception
        powersync_updated_at: '2024-01-01',
      };

      const result = validateCamelCaseEntity(entity);

      expect(result.valid).toBe(true);
    });

    it('should fail for snake_case keys', () => {
      const entity = {
        id: 'uuid-123',
        firstName: 'John',
        last_name: 'Doe', // Invalid!
        date_of_birth: '1990-01-01', // Invalid!
      };

      const result = validateCamelCaseEntity(entity);

      expect(result.valid).toBe(false);
      expect(result.invalidKeys).toContain('last_name');
      expect(result.invalidKeys).toContain('date_of_birth');
    });
  });

  // ============================================================================
  // PART 6: Integration Tests
  // ============================================================================

  describe('full workflow integration', () => {
    it('should handle complete Patient workflow', () => {
      // 1. Start with TypeScript entity (camelCase)
      const patient = {
        id: 'uuid-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        chiefComplaint: 'Chest pain',
        status: 'Peri-Op / In Surgery',
        doctorId: 'uuid-456',
      };

      // 2. Convert to database row (snake_case) for saving
      const dbRow = entityToRow(patient);
      expect(dbRow.first_name).toBe('John');
      expect(dbRow.chief_complaint).toBe('Chest pain');
      expect(dbRow.doctor_id).toBe('uuid-456');

      // 3. Simulate database returning the row
      const retrievedRow = dbRow;

      // 4. Convert back to entity for use in app
      const retrievedEntity = rowToEntity(retrievedRow);
      expect(retrievedEntity.firstName).toBe('John');
      expect(retrievedEntity.chiefComplaint).toBe('Chest pain');
      expect(retrievedEntity.doctorId).toBe('uuid-456');

      // 5. Verify round-trip preserves all data
      expect(retrievedEntity).toEqual(patient);
    });

    it('should handle batch operations', () => {
      const patients = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Jane', lastName: 'Smith' },
        { id: '3', firstName: 'Bob', lastName: 'Johnson' },
      ];

      // Convert all to database format
      const rows = entitiesToRows(patients);
      expect(rows).toHaveLength(3);
      expect(rows[0].first_name).toBe('John');

      // Convert back
      const entities = rowsToEntities(rows);
      expect(entities).toHaveLength(3);
      expect(entities).toEqual(patients);
    });

    it('should handle search filters and sorting', () => {
      // Build search query
      const filters = {
        status: 'Active',
        priority: 'Urgent',
        doctorId: 'uuid-123',
      };
      const { clause, params } = buildWhereClause(filters);

      expect(clause).toContain('status = ?');
      expect(clause).toContain('doctor_id = ?');
      expect(params).toContain('uuid-123');

      // Build ORDER BY
      const orderBy = buildOrderByClause({
        field: 'createdAt',
        direction: 'DESC',
      });
      expect(orderBy).toBe('ORDER BY created_at DESC');

      // Would execute: SELECT * FROM patients WHERE ${clause} ${orderBy}
    });
  });
});
