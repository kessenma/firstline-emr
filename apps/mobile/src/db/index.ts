// apps/mobile/src/db/index.ts
// PowerSync Database Module - Main Export
// Centralized exports for PowerSync schema, helpers, and utilities

export { powerSyncSchema, TABLES } from './powerSyncSchema';
export type { PowerSyncTableName } from './powerSyncSchema';

export {
  // Query builders
  buildWhereClause,
  buildOrderByClause,
  buildLimitClause,
  buildSelectQuery,

  // JSON helpers
  parseJsonField,
  stringifyJsonField,

  // Boolean helpers
  boolToInt,
  intToBool,

  // Timestamp helpers
  dateToIsoString,
  isoStringToDate,

  // UUID helpers
  generateId,
  isValidUuid,

  // UI state
  buildGetUiStateQuery,
  buildSetUiStateQuery,
  UI_STATE_KEYS,

  // Offline queue
  buildEnqueueMutationQuery,
  buildGetPendingMutationsQuery,
  buildDequeueMutationQuery,
  buildUpdateMutationRetryQuery,

  // Sync metadata
  buildUpdateSyncMetadataQuery,
  buildGetSyncMetadataQuery,
  buildGetAllSyncMetadataQuery,

  // Common queries
  buildGetPatientByIdQuery,
  buildGetPatientsByStatusQuery,
  buildGetNotesForPatientQuery,
  buildGetUnreadNotificationCountQuery,
  buildSearchPatientsQuery,

  // Batch operations
  buildBatchInsertQuery,
  buildBatchUpdateQuery,

  // Validation
  validateRequiredFields,
  sanitizeSqlInput,
} from './helpers';

export type {
  WhereCondition,
  OrderBy,
  QueryOptions,
  UiState,
  OfflineQueueItem,
  SyncMetadata,
} from './helpers';

// Re-export default helpers object
export { default as dbHelpers } from './helpers';

// Re-export schema as default
export { default } from './powerSyncSchema';
