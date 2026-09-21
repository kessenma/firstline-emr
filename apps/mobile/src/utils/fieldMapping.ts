// apps/mobile/src/utils/fieldMapping.ts
// Field mapping utilities for MongoDB ↔ PostgreSQL compatibility during Phase 2.2
// Generic case conversion utilities are in @fajr/shared/field-mapping

import { isValidUUID, generateUUID } from './uuid';
import {
  camelToSnake,
  keysToSnakeCase,
  keysToCamelCase,
} from '@fajr/shared/field-mapping';

// Re-export shared utilities for existing consumers
export {
  camelToSnake,
  snakeToCamel,
  keysToSnakeCase,
  keysToCamelCase,
} from '@fajr/shared/field-mapping';

// ============================================================================
// PART 2: Database Row Types (snake_case for PostgreSQL/PowerSync)
// ============================================================================

/**
 * Database row type for users table (snake_case)
 * Use this for PowerSync queries and raw SQL results
 */
export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_type: 'Doctor' | 'Triage';
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  languages?: string[];
  countries?: string[];
  specialties?: string[];
  phone?: string;
  created_at?: string;
  updated_at?: string;
  // PowerSync metadata
  powersync_id?: string;
  powersync_updated_at?: string;
}

/**
 * Database row type for patients table (snake_case)
 * Use this for PowerSync queries and raw SQL results
 */
export interface PatientRow {
  id: string;
  first_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  city?: string;
  country?: string;
  language?: string;
  chief_complaint?: string;
  status?: 'Pre-Op / Not Cleared' | 'Pre-Op / Cleared' | 'Peri-Op / In Surgery' | 'Post-Op / In-Patient' | 'Post-Op / Discharged';
  priority?: 'Not Selected' | 'Routine' | 'Moderate' | 'Urgent' | 'Emergency';
  specialties?: string[];
  specialty?: string;
  dashboard_notes?: string;
  telegram_chat_id?: string;
  triaged_by_id?: string;
  doctor_id?: string;
  coordinator_id?: string;
  created_at?: string;
  updated_at?: string;
  // PowerSync metadata
  powersync_id?: string;
  powersync_updated_at?: string;
}

/**
 * Database row type for messages table (snake_case)
 * Use this for PowerSync queries and raw SQL results
 */
export interface MessageRow {
  id: string;
  text: string;
  sender: string;
  sender_id?: string;
  timestamp: string;
  type?: 'text' | 'image' | 'audio' | 'file';
  media_url?: string;
  signed_url?: string;
  is_self?: boolean;
  file_name?: string;
  // PowerSync metadata
  powersync_id?: string;
  powersync_updated_at?: string;
}

/**
 * Database row type for threads table (snake_case)
 * Use this for PowerSync queries and raw SQL results
 */
export interface ThreadRow {
  id?: string;
  chat_id?: string;
  participants: string[];
  unread_count: number;
  title?: string;
  type: 'internal' | 'telegram';
  is_group_chat?: boolean;
  slug?: string;
  last_activity?: string;
  // PowerSync metadata
  powersync_id?: string;
  powersync_updated_at?: string;
}

// ============================================================================
// PART 3: Type Conversion Utilities (re-exported from @fajr/shared/field-mapping)
// ============================================================================

export {
  rowToEntity,
  entityToRow,
  rowsToEntities,
  entitiesToRows,
} from '@fajr/shared/field-mapping';

// ============================================================================
// PART 4: PowerSync Query Helpers
// ============================================================================

/**
 * Builds a PowerSync-compatible WHERE clause with snake_case field names
 * Example: { firstName: 'John', status: 'Active' } → "first_name = ? AND status = ?"
 */
export function buildWhereClause(conditions: Record<string, any>): {
  clause: string;
  params: any[];
} {
  const snakeConditions = keysToSnakeCase(conditions);
  const entries = Object.entries(snakeConditions).filter(
    ([_, value]) => value !== undefined,
  );

  if (entries.length === 0) {
    return { clause: '', params: [] };
  }

  const clause = entries.map(([key]) => `${key} = ?`).join(' AND ');
  const params = entries.map(([_, value]) => value);

  return { clause, params };
}

/**
 * Builds a PowerSync SELECT query with proper field name conversion
 * Example: ['firstName', 'lastName'] → 'first_name, last_name'
 */
export function buildSelectFields(fields: string[]): string {
  return fields.map(field => camelToSnake(field)).join(', ');
}

/**
 * Builds a PowerSync ORDER BY clause with proper field name conversion
 * Example: { field: 'createdAt', direction: 'DESC' } → 'created_at DESC'
 */
export function buildOrderByClause(orderBy?: {
  field: string;
  direction: 'ASC' | 'DESC';
}): string {
  if (!orderBy) return '';
  return `ORDER BY ${camelToSnake(orderBy.field)} ${orderBy.direction}`;
}

// ============================================================================
// PART 5: Legacy MongoDB Compatibility (Phase 2.1)
// ============================================================================

// Legacy MongoDB → PostgreSQL field mapping (for backward compatibility)
// NOTE: Prefer using generic camelToSnake/snakeToCamel functions above
export const FIELD_MAPPING = {
  // ID fields
  _id: 'id',

  // Reference fields (User references)
  triagedBy: 'triaged_by_id',
  doctor: 'doctor_id',
  coordinator: 'coordinator_id',
  createdBy: 'created_by_id',
  senderId: 'sender_id',

  // Date fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Patient-specific fields
  firstName: 'first_name',
  lastName: 'last_name',
  dateOfBirth: 'date_of_birth',
  chiefComplaint: 'chief_complaint',
  dashboardNotes: 'dashboard_notes',
  telegramChatId: 'telegram_chat_id',

  // Message/thread fields
  isGroupChat: 'is_group_chat',
  lastActivity: 'last_activity',
  unreadCount: 'unread_count',
  chatId: 'chat_id',
} as const;


/**
 * Converts MongoDB-style object to PostgreSQL-style object
 * Handles ID conversion and field name mapping
 */
export function mapToPostgreSQL<T extends Record<string, any>>(mongoObj: T): T {
  const result = { ...mongoObj };

  // Map _id to id with UUID validation
  if ('_id' in result) {
    const originalId = result._id;
    delete result._id;

    if (typeof originalId === 'string') {
      // If it's already a valid UUID, use it
      if (isValidUUID(originalId)) {
        (result as any).id = originalId;
      } else {
        // Generate new UUID for non-UUID IDs
        console.warn(`Converting non-UUID _id to new UUID: ${originalId}`);
        (result as any).id = generateUUID();
      }
    } else {
      // Generate new UUID for non-string IDs
      console.warn(
        `Converting ${typeof originalId} _id to new UUID:`,
        originalId,
      );
      (result as any).id = generateUUID();
    }
  }

  // Map reference fields to UUID foreign keys
  Object.entries(FIELD_MAPPING).forEach(([mongoField, pgField]) => {
    if (mongoField in result && mongoField !== '_id') {
      const value = result[mongoField];

      // Handle reference fields (User references)
      if (
        ['triagedBy', 'doctor', 'coordinator', 'createdBy'].includes(mongoField)
      ) {
        if (value && typeof value === 'object' && value && 'id' in value) {
          // If it's a populated object with id field, extract the UUID
          (result as any)[pgField] = (value as any).id;
        } else if (typeof value === 'string') {
          // If it's already a string, check if it's a UUID
          if (isValidUUID(value)) {
            (result as any)[pgField] = value;
          } else {
            // Generate new UUID for non-UUID references
            console.warn(
              `Converting non-UUID reference ${mongoField} to new UUID: ${value}`,
            );
            (result as any)[pgField] = generateUUID();
          }
        }
        delete (result as any)[mongoField];
      }
      // Handle other field mappings
      else if (value !== undefined) {
        (result as any)[pgField] = value;
        delete result[mongoField];
      }
    }
  });

  return result;
}

/**
 * Converts PostgreSQL-style object to MongoDB-style object
 * Useful for backward compatibility during transition
 */

/**
 * Safely extracts UUID from various reference formats
 * Handles populated objects, UUID strings, and legacy formats
 */
export function extractUUIDReference(ref: any): string | undefined {
  if (!ref) return undefined;

  // If it's a string, check if it's a valid UUID
  if (typeof ref === 'string') {
    return isValidUUID(ref) ? ref : generateUUID();
  }

  // If it's an object with id field (populated reference)
  if (typeof ref === 'object' && 'id' in ref) {
    const id = ref.id;
    if (typeof id === 'string' && isValidUUID(id)) {
      return id;
    }
  }

  // If it's an object with _id field (legacy populated reference)
  if (typeof ref === 'object' && '_id' in ref) {
    const id = ref._id;
    if (typeof id === 'string') {
      return isValidUUID(id) ? id : generateUUID();
    }
  }

  // For other cases, generate new UUID
  console.warn('Unable to extract UUID from reference, generating new:', ref);
  return generateUUID();
}

/**
 * Normalizes an entire array of objects for PostgreSQL compatibility
 */
export function normalizeArrayForPostgreSQL<T extends Record<string, any>>(
  array: T[],
): T[] {
  return array.map(item => mapToPostgreSQL(item));
}

/**
 * Validates that an object has all required UUID fields
 */
export function validatePostgreSQLObject(
  obj: Record<string, any>,
  requiredFields: string[] = [],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that id field exists and is valid UUID
  if ('id' in obj) {
    if (!isValidUUID(obj.id)) {
      errors.push(`Invalid UUID for id field: ${obj.id}`);
    }
  } else {
    errors.push('Missing required id field');
  }

  // Check required reference fields
  for (const field of requiredFields) {
    if (field in obj) {
      const value = obj[field];
      if (value && !isValidUUID(value)) {
        errors.push(`Invalid UUID for ${field} field: ${value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a mapping summary for debugging
 */
export function getMappingSummary(): {
  mappings: Record<string, string>;
} {
  return {
    mappings: { ...FIELD_MAPPING },
  };
}

// ============================================================================
// PART 6: Validation & Testing Utilities
// ============================================================================

/**
 * Tests case conversion round-trip to ensure no data loss
 */
export function testCaseConversion(obj: Record<string, any>): {
  success: boolean;
  original: Record<string, any>;
  converted: Record<string, any>;
  errors: string[];
} {
  const errors: string[] = [];

  // Convert to snake_case and back
  const toSnake = keysToSnakeCase(obj);
  const backToCamel = keysToCamelCase(toSnake);

  // Check if all keys match
  const originalKeys = Object.keys(obj).sort();
  const convertedKeys = Object.keys(backToCamel).sort();

  if (JSON.stringify(originalKeys) !== JSON.stringify(convertedKeys)) {
    errors.push('Key mismatch after round-trip conversion');
  }

  // Check if values are preserved (shallow check)
  for (const key of originalKeys) {
    if (
      obj[key] !== backToCamel[key] &&
      JSON.stringify(obj[key]) !== JSON.stringify(backToCamel[key])
    ) {
      errors.push(`Value mismatch for key "${key}"`);
    }
  }

  return {
    success: errors.length === 0,
    original: obj,
    converted: backToCamel,
    errors,
  };
}

/**
 * Validates that a database row has proper snake_case naming
 */
export function validateSnakeCaseRow(row: Record<string, any>): {
  valid: boolean;
  invalidKeys: string[];
} {
  const invalidKeys: string[] = [];

  for (const key of Object.keys(row)) {
    // Check if key contains uppercase letters (invalid for snake_case)
    if (/[A-Z]/.test(key)) {
      invalidKeys.push(key);
    }
  }

  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
  };
}

/**
 * Validates that a TypeScript entity has proper camelCase naming
 */
export function validateCamelCaseEntity(entity: Record<string, any>): {
  valid: boolean;
  invalidKeys: string[];
} {
  const invalidKeys: string[] = [];

  for (const key of Object.keys(entity)) {
    // Check if key contains underscores (invalid for camelCase)
    if (key.includes('_') && !key.startsWith('powersync_')) {
      invalidKeys.push(key);
    }
  }

  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
  };
}
