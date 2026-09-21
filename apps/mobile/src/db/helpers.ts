// apps/mobile/src/db/helpers.ts
// PowerSync Schema Helper Utilities
// Provides common database operations and query builders for PowerSync

import { TABLES } from './powerSyncSchema';
import type { PowerSyncTableName } from './powerSyncSchema';

/**
 * Generate a UUID v4 (simple implementation without external dependency)
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * SQL Query Builder Helpers
 */

export interface WhereCondition {
  field: string;
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'LIKE'
    | 'IN'
    | 'IS NULL'
    | 'IS NOT NULL';
  value?: any;
}

export interface OrderBy {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryOptions {
  where?: WhereCondition[];
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
}

/**
 * Build a WHERE clause from conditions
 */
export function buildWhereClause(conditions: WhereCondition[]): {
  sql: string;
  params: any[];
} {
  if (!conditions || conditions.length === 0) {
    return { sql: '', params: [] };
  }

  const clauses: string[] = [];
  const params: any[] = [];

  for (const condition of conditions) {
    if (
      condition.operator === 'IS NULL' ||
      condition.operator === 'IS NOT NULL'
    ) {
      clauses.push(`${condition.field} ${condition.operator}`);
    } else if (condition.operator === 'IN') {
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value];
      const placeholders = values.map(() => '?').join(', ');
      clauses.push(`${condition.field} IN (${placeholders})`);
      params.push(...values);
    } else {
      clauses.push(`${condition.field} ${condition.operator} ?`);
      params.push(condition.value);
    }
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

/**
 * Build an ORDER BY clause
 */
export function buildOrderByClause(orderBy: OrderBy[]): string {
  if (!orderBy || orderBy.length === 0) {
    return '';
  }

  const clauses = orderBy.map(o => `${o.field} ${o.direction}`);
  return `ORDER BY ${clauses.join(', ')}`;
}

/**
 * Build a LIMIT/OFFSET clause
 */
export function buildLimitClause(limit?: number, offset?: number): string {
  const parts: string[] = [];

  if (limit !== undefined) {
    parts.push(`LIMIT ${limit}`);
  }

  if (offset !== undefined) {
    parts.push(`OFFSET ${offset}`);
  }

  return parts.join(' ');
}

/**
 * Build a complete SELECT query
 */
export function buildSelectQuery(
  table: PowerSyncTableName,
  columns: string[] = ['*'],
  options: QueryOptions = {},
): { sql: string; params: any[] } {
  const columnList = columns.map(String).join(', ');
  const wherePart = buildWhereClause(options.where || []);
  const orderByPart = buildOrderByClause(options.orderBy || []);
  const limitPart = buildLimitClause(options.limit, options.offset);

  const sql = [
    `SELECT ${columnList}`,
    `FROM ${String(table)}`,
    wherePart.sql,
    orderByPart,
    limitPart,
  ]
    .filter(Boolean)
    .join(' ');

  return { sql, params: wherePart.params };
}

/**
 * JSON Field Helpers
 */

/**
 * Parse a JSON field safely
 */
export function parseJsonField<T>(
  value: string | null | undefined,
  defaultValue: T,
): T {
  if (!value) return defaultValue;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse JSON field:', error);
    return defaultValue;
  }
}

/**
 * Stringify a value for JSON storage
 */
export function stringifyJsonField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to stringify JSON field:', error);
    return '';
  }
}

/**
 * Boolean Conversion Helpers (SQLite stores as 0/1)
 */

export function boolToInt(value: boolean | null | undefined): number {
  return value ? 1 : 0;
}

export function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

/**
 * Timestamp Helpers
 */

/**
 * Convert Date to ISO string for storage
 */
export function dateToIsoString(
  date: Date | string | null | undefined,
): string {
  if (!date) return new Date().toISOString();

  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }

  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function isoStringToDate(
  isoString: string | null | undefined,
): Date | null {
  if (!isoString) return null;

  try {
    return new Date(isoString);
  } catch (error) {
    console.warn('Failed to parse ISO string:', error);
    return null;
  }
}

/**
 * UUID Helpers
 */

/**
 * Generate a new UUID v4
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * UI State Management
 */

export interface UiState<T = any> {
  key: string;
  value: T;
  updated_at: string;
}

/**
 * UI state key constants
 */
export const UI_STATE_KEYS = {
  PATIENT_FILTERS: 'patient_filters',
  PATIENT_SORT: 'patient_sort',
  MESSAGE_FILTERS: 'message_filters',
  LAST_SYNC_TIME: 'last_sync_time',
  SELECTED_TAB: 'selected_tab',
  SEARCH_HISTORY: 'search_history',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  THEME_PREFERENCE: 'theme_preference',
  LANGUAGE_PREFERENCE: 'language_preference',
} as const;

/**
 * Build UI state query
 */
export function buildGetUiStateQuery(key: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: `SELECT value FROM ${TABLES.UI_STATE} WHERE key = ?`,
    params: [key],
  };
}

/**
 * Build UI state upsert query
 */
export function buildSetUiStateQuery(
  key: string,
  value: any,
): { sql: string; params: any[] } {
  return {
    sql: `INSERT OR REPLACE INTO ${TABLES.UI_STATE} (key, value, updated_at) VALUES (?, ?, ?)`,
    params: [key, stringifyJsonField(value), dateToIsoString(new Date())],
  };
}

/**
 * Offline Queue Management
 */

export interface OfflineQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  data: string; // JSON
  retry_count: number;
  error?: string;
  created_at: string;
  attempted_at?: string;
}

/**
 * Build query to add item to offline queue
 */
export function buildEnqueueMutationQuery(
  operation: 'create' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  data: any,
): { sql: string; params: any[] } {
  const id = generateId();
  const now = dateToIsoString(new Date());

  return {
    sql: `INSERT INTO ${TABLES.OFFLINE_QUEUE}
          (id, operation, table_name, record_id, data, retry_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params: [
      id,
      operation,
      tableName,
      recordId,
      stringifyJsonField(data),
      0,
      now,
    ],
  };
}

/**
 * Build query to get pending mutations
 */
export function buildGetPendingMutationsQuery(): {
  sql: string;
  params: any[];
} {
  return {
    sql: `SELECT * FROM ${TABLES.OFFLINE_QUEUE} ORDER BY created_at ASC`,
    params: [],
  };
}

/**
 * Build query to remove mutation from queue
 */
export function buildDequeueMutationQuery(id: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: `DELETE FROM ${TABLES.OFFLINE_QUEUE} WHERE id = ?`,
    params: [id],
  };
}

/**
 * Build query to update mutation retry count
 */
export function buildUpdateMutationRetryQuery(
  id: string,
  retryCount: number,
  error?: string,
): { sql: string; params: any[] } {
  const now = dateToIsoString(new Date());

  if (error) {
    return {
      sql: `UPDATE ${TABLES.OFFLINE_QUEUE}
            SET retry_count = ?, error = ?, attempted_at = ?
            WHERE id = ?`,
      params: [retryCount, error, now, id],
    };
  }

  return {
    sql: `UPDATE ${TABLES.OFFLINE_QUEUE}
          SET retry_count = ?, attempted_at = ?
          WHERE id = ?`,
    params: [retryCount, now, id],
  };
}

/**
 * Sync Metadata Management
 */

export interface SyncMetadata {
  table_name: string;
  last_sync_at: string;
  last_sync_success: number; // 0 or 1
  last_sync_error?: string;
  record_count: number;
  pending_uploads: number;
}

/**
 * Build query to update sync metadata
 */
export function buildUpdateSyncMetadataQuery(
  tableName: string,
  success: boolean,
  recordCount?: number,
  error?: string,
): { sql: string; params: any[] } {
  const now = dateToIsoString(new Date());

  return {
    sql: `INSERT OR REPLACE INTO ${TABLES.SYNC_METADATA}
          (table_name, last_sync_at, last_sync_success, last_sync_error, record_count, pending_uploads)
          VALUES (?, ?, ?, ?, ?, ?)`,
    params: [
      tableName,
      now,
      boolToInt(success),
      error || null,
      recordCount ?? 0,
      0, // pending_uploads will be updated separately
    ],
  };
}

/**
 * Build query to get sync metadata for a table
 */
export function buildGetSyncMetadataQuery(tableName: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: `SELECT * FROM ${TABLES.SYNC_METADATA} WHERE table_name = ?`,
    params: [tableName],
  };
}

/**
 * Build query to get all sync metadata
 */
export function buildGetAllSyncMetadataQuery(): { sql: string; params: any[] } {
  return {
    sql: `SELECT * FROM ${TABLES.SYNC_METADATA} ORDER BY last_sync_at DESC`,
    params: [],
  };
}

/**
 * Common Table Queries
 */

/**
 * Get patient by ID query
 */
export function buildGetPatientByIdQuery(patientId: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: `SELECT * FROM ${TABLES.PATIENTS} WHERE id = ?`,
    params: [patientId],
  };
}

/**
 * Get patients by status query
 */
export function buildGetPatientsByStatusQuery(
  status: string,
  limit?: number,
): { sql: string; params: any[] } {
  const limitClause = limit ? `LIMIT ${limit}` : '';
  return {
    sql: `SELECT * FROM ${TABLES.PATIENTS}
          WHERE status = ?
          ORDER BY priority DESC, created_at DESC
          ${limitClause}`,
    params: [status],
  };
}

/**
 * Get notes for patient query
 */
export function buildGetNotesForPatientQuery(
  patientId: string,
  includeAuthor: boolean = false,
): { sql: string; params: string[] } {
  if (includeAuthor) {
    return {
      sql: `SELECT
              n.*,
              u.first_name as author_first_name,
              u.last_name as author_last_name,
              u.email as author_email
            FROM ${TABLES.NOTES} n
            LEFT JOIN ${TABLES.USERS} u ON n.author_id = u.id
            WHERE n.patient_id = ?
            ORDER BY n.date DESC`,
      params: [patientId],
    };
  }

  return {
    sql: `SELECT * FROM ${TABLES.NOTES}
          WHERE patient_id = ?
          ORDER BY date DESC`,
    params: [patientId],
  };
}

/**
 * Get unread notification count query
 */
export function buildGetUnreadNotificationCountQuery(userId: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: `SELECT COUNT(*) as count
          FROM ${TABLES.NOTIFICATIONS} n
          INNER JOIN ${TABLES.NOTIFICATION_RECIPIENTS} nr ON n.id = nr.notification_id
          WHERE nr.user_id = ?`,
    params: [userId],
  };
}

/**
 * Search patients query
 */
export function buildSearchPatientsQuery(
  searchTerm: string,
  limit: number = 50,
): { sql: string; params: string[] } {
  const term = `%${searchTerm}%`;
  return {
    sql: `SELECT * FROM ${TABLES.PATIENTS}
          WHERE first_name LIKE ?
             OR last_name LIKE ?
             OR email LIKE ?
             OR telegram_chat_id LIKE ?
          ORDER BY created_at DESC
          LIMIT ${limit}`,
    params: [term, term, term, term],
  };
}

/**
 * Transaction Helpers
 */

/**
 * Build batch insert query
 */
export function buildBatchInsertQuery(
  table: PowerSyncTableName,
  records: Record<string, any>[],
): { sql: string; params: any[] }[] {
  return records.map(record => {
    const columns = Object.keys(record).map(String);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => record[col]);

    return {
      sql: `INSERT OR REPLACE INTO ${String(table)} (${columns.join(
        ', ',
      )}) VALUES (${placeholders})`,
      params: values,
    };
  });
}

/**
 * Build batch update query
 */
export function buildBatchUpdateQuery(
  table: PowerSyncTableName,
  idField: string,
  records: Record<string, any>[],
): { sql: string; params: any[] }[] {
  return records.map(record => {
    const { [idField]: id, ...updates } = record;
    const columns = Object.keys(updates).map(String);
    const setClauses = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => updates[col]), id];

    return {
      sql: `UPDATE ${String(table)} SET ${setClauses} WHERE ${idField} = ?`,
      params: values,
    };
  });
}

/**
 * Validation Helpers
 */

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[],
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    return value === null || value === undefined || value === '';
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize SQL input (basic protection)
 */
export function sanitizeSqlInput(input: string): string {
  // Remove dangerous SQL characters/keywords
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .trim();
}

/**
 * Export all helpers
 */
export default {
  buildWhereClause,
  buildOrderByClause,
  buildLimitClause,
  buildSelectQuery,
  parseJsonField,
  stringifyJsonField,
  boolToInt,
  intToBool,
  dateToIsoString,
  isoStringToDate,
  generateId,
  isValidUuid,
  buildGetUiStateQuery,
  buildSetUiStateQuery,
  buildEnqueueMutationQuery,
  buildGetPendingMutationsQuery,
  buildDequeueMutationQuery,
  buildUpdateMutationRetryQuery,
  buildUpdateSyncMetadataQuery,
  buildGetSyncMetadataQuery,
  buildGetAllSyncMetadataQuery,
  buildGetPatientByIdQuery,
  buildGetPatientsByStatusQuery,
  buildGetNotesForPatientQuery,
  buildGetUnreadNotificationCountQuery,
  buildSearchPatientsQuery,
  buildBatchInsertQuery,
  buildBatchUpdateQuery,
  validateRequiredFields,
  sanitizeSqlInput,
  UI_STATE_KEYS,
};
