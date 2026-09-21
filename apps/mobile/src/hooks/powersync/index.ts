// apps/mobile/src/hooks/powersync/index.ts
// PowerSync React hooks - centralized exports

// Main PowerSync context hook
export { usePowerSync, usePowerSyncReady, usePowerSyncConnection } from './usePowerSync';
export type { PowerSyncProviderProps, PowerSyncContextType } from './usePowerSync';

// Query hooks
export { usePowerSyncQuery, usePowerSyncQueryById, usePowerSyncQueryMany, usePowerSyncQueryPaginated, usePowerSyncQueryCount } from './usePowerSyncQuery';
export type { PowerSyncQueryOptions, PowerSyncQueryResult } from './usePowerSyncQuery';

export { usePowerSyncPagedList } from './usePowerSyncPagedList';
export type { PowerSyncPagedListOptions, PowerSyncPagedListResult } from './usePowerSyncPagedList';

// Mutation hooks
export { usePowerSyncMutation, usePowerSyncInsert, usePowerSyncUpdate, usePowerSyncDelete, usePowerSyncBatchMutation } from './usePowerSyncMutation';
export type { PowerSyncMutationOptions, PowerSyncMutationResult } from './usePowerSyncMutation';

// Sync status hooks
export { useSyncStatus, useSyncConnection, useSyncProgress, useSyncErrors, useSyncStatistics } from './useSyncStatus';
export type { SyncStatusOptions, SyncStatusResult } from './useSyncStatus';

// Sync data summary
export { useSyncDataSummary } from './useSyncDataSummary';
export type { SyncDataCounts, SyncDataSummaryResult } from './useSyncDataSummary';

// Sync ↔ DownloadProgress bridge (call in CustomTabBar)
export { useSyncDownloadBridge } from './useSyncDownloadBridge';
