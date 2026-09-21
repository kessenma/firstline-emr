// apps/mobile/src/services/powersync/OfflineAccountSwitcherService.ts
// Offline-first account switching service using PowerSync

import { PowerSyncService } from './PowerSyncService';
import { TokenStorage } from '../TokenStorage';
import { apiClient } from '../api';
import { TABLES } from '../../db/powerSyncSchema';

export type AccountType = 'Doctor' | 'Triage';

interface ProfileChange {
  field: string;
  oldValue: any;
  newValue: any;
}

interface UserProfileLog {
  id: string;
  userId: string;
  changedBy: string;
  changedAt: string;
  changes: ProfileChange[];
  isAdminAction: boolean;
  createdAt: string;
}

interface OfflineQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  data: string; // JSON string
  retry_count: number;
  error: string | null;
  created_at: string;
  attempted_at: string | null;
}

interface AccountSwitchResult {
  success: boolean;
  isOffline: boolean;
  queuedForSync: boolean;
  updatedUser: any;
  error?: string;
}

/**
 * OfflineAccountSwitcherService
 *
 * Handles account type switching with offline-first capabilities:
 * - Optimistic updates to local user state
 * - Queues changes when offline
 * - Syncs to userProfileLogs when back online
 * - Handles conflicts and retries
 */
export class OfflineAccountSwitcherService {
  private static instance: OfflineAccountSwitcherService;

  private constructor() {}

  static getInstance(): OfflineAccountSwitcherService {
    if (!OfflineAccountSwitcherService.instance) {
      OfflineAccountSwitcherService.instance = new OfflineAccountSwitcherService();
    }
    return OfflineAccountSwitcherService.instance;
  }

  /**
   * Switch account type with offline support
   *
   * Flow:
   * 1. Check if online
   * 2. If online: Try API call first
   * 3. If offline or API fails: Queue for later + optimistic update
   * 4. Update local AuthContext immediately
   * 5. When back online: Process queue and create audit log
   */
  async switchAccountType(
    userId: string,
    currentType: AccountType,
    newType: AccountType,
    user: any,
  ): Promise<AccountSwitchResult> {
    console.log('[OfflineAccountSwitcher] Starting account type switch...');
    console.log('[OfflineAccountSwitcher] User ID:', userId);
    console.log('[OfflineAccountSwitcher] Current type:', currentType);
    console.log('[OfflineAccountSwitcher] New type:', newType);

    // Check if we're online
    const isOnline = await this.checkOnlineStatus();
    console.log('[OfflineAccountSwitcher] Online status:', isOnline);

    if (isOnline) {
      // Try API call first
      try {
        const result = await this.switchOnline(userId, currentType, newType, user);
        console.log('[OfflineAccountSwitcher] ✅ Online switch successful');
        return result;
      } catch (error) {
        console.warn('[OfflineAccountSwitcher] ⚠️ Online switch failed, falling back to offline mode');
        console.warn('[OfflineAccountSwitcher] Error:', error);
        // Fall through to offline mode
      }
    }

    // Offline mode or API failed - queue for later
    const result = await this.switchOffline(userId, currentType, newType, user);
    console.log('[OfflineAccountSwitcher] ✅ Offline switch queued');
    return result;
  }

  /**
   * Online mode: API call + immediate audit log
   */
  private async switchOnline(
    userId: string,
    currentType: AccountType,
    newType: AccountType,
    user: any,
  ): Promise<AccountSwitchResult> {
    // 1. Call API to update account type
    const response = await apiClient.patch(`/api/user/${userId}`, {
      accountType: newType,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error('No data returned from server');
    }

    // 2. Create audit log entry via API
    await this.createAuditLog(userId, userId, currentType, newType, true);

    // 3. Update local user object
    const updatedUser = {
      ...user,
      accountType: newType,
    };

    return {
      success: true,
      isOffline: false,
      queuedForSync: false,
      updatedUser,
    };
  }

  /**
   * Offline mode: Optimistic update + queue for sync
   */
  private async switchOffline(
    userId: string,
    currentType: AccountType,
    newType: AccountType,
    user: any,
  ): Promise<AccountSwitchResult> {
    try {
      // 1. Queue the account type update
      await this.queueAccountTypeUpdate(userId, currentType, newType);

      // 2. Queue the audit log entry
      await this.queueAuditLogEntry(userId, userId, currentType, newType);

      // 3. Update local user object optimistically
      const updatedUser = {
        ...user,
        accountType: newType,
      };

      // 4. Update local PowerSync users table if available
      await this.updateLocalUserTable(userId, newType);

      return {
        success: true,
        isOffline: true,
        queuedForSync: true,
        updatedUser,
      };
    } catch (error) {
      console.error('[OfflineAccountSwitcher] Error in offline switch:', error);
      return {
        success: false,
        isOffline: true,
        queuedForSync: false,
        updatedUser: user,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Queue account type update for sync
   */
  private async queueAccountTypeUpdate(
    userId: string,
    oldType: AccountType,
    newType: AccountType,
  ): Promise<void> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      console.warn('[OfflineAccountSwitcher] PowerSync not ready, skipping queue');
      return;
    }

    const queueItem: Omit<OfflineQueueItem, 'id' | 'created_at'> = {
      operation: 'update',
      table_name: TABLES.USERS,
      record_id: userId,
      data: JSON.stringify({
        accountType: newType,
        oldAccountType: oldType,
      }),
      retry_count: 0,
      error: null,
      attempted_at: null,
    };

    await powerSync.execute(
      `INSERT INTO ${TABLES.OFFLINE_QUEUE}
       (id, operation, table_name, record_id, data, retry_count, error, created_at, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)`,
      [
        this.generateUUID(),
        queueItem.operation,
        queueItem.table_name,
        queueItem.record_id,
        queueItem.data,
        queueItem.retry_count,
        queueItem.error,
      ],
    );

    console.log('[OfflineAccountSwitcher] ✅ Account type update queued');
  }

  /**
   * Queue audit log entry for sync
   */
  private async queueAuditLogEntry(
    userId: string,
    changedBy: string,
    oldType: AccountType,
    newType: AccountType,
  ): Promise<void> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      console.warn('[OfflineAccountSwitcher] PowerSync not ready, skipping audit log queue');
      return;
    }

    const changes: ProfileChange[] = [
      {
        field: 'accountType',
        oldValue: oldType,
        newValue: newType,
      },
    ];

    const logId = this.generateUUID();
    const now = new Date().toISOString();

    const queueItem: Omit<OfflineQueueItem, 'id' | 'created_at'> = {
      operation: 'create',
      table_name: TABLES.USER_PROFILE_LOGS,
      record_id: logId,
      data: JSON.stringify({
        id: logId,
        userId,
        changedBy,
        changedAt: now,
        changes,
        isAdminAction: true,
        createdAt: now,
      }),
      retry_count: 0,
      error: null,
      attempted_at: null,
    };

    await powerSync.execute(
      `INSERT INTO ${TABLES.OFFLINE_QUEUE}
       (id, operation, table_name, record_id, data, retry_count, error, created_at, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)`,
      [
        this.generateUUID(),
        queueItem.operation,
        queueItem.table_name,
        queueItem.record_id,
        queueItem.data,
        queueItem.retry_count,
        queueItem.error,
      ],
    );

    console.log('[OfflineAccountSwitcher] ✅ Audit log queued');
  }

  /**
   * Update local PowerSync users table
   */
  private async updateLocalUserTable(
    userId: string,
    newType: AccountType,
  ): Promise<void> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      return;
    }

    try {
      await powerSync.execute(
        `UPDATE ${TABLES.USERS} SET account_type = ? WHERE id = ?`,
        [newType, userId],
      );
      console.log('[OfflineAccountSwitcher] ✅ Local users table updated');
    } catch (error) {
      console.warn('[OfflineAccountSwitcher] Failed to update local users table:', error);
      // Non-blocking error
    }
  }

  /**
   * Create audit log entry via API
   */
  private async createAuditLog(
    userId: string,
    changedBy: string,
    oldType: AccountType,
    newType: AccountType,
    isAdminAction: boolean,
  ): Promise<void> {
    const changes: ProfileChange[] = [
      {
        field: 'accountType',
        oldValue: oldType,
        newValue: newType,
      },
    ];

    try {
      await apiClient.post('/api/user-profile-logs', {
        userId,
        changedBy,
        changes,
        isAdminAction,
      });
      console.log('[OfflineAccountSwitcher] ✅ Audit log created via API');
    } catch (error) {
      console.warn('[OfflineAccountSwitcher] Failed to create audit log:', error);
      // Non-blocking error - will be queued if offline
    }
  }

  /**
   * Process offline queue - sync all pending changes
   */
  async processPendingQueue(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    console.log('[OfflineAccountSwitcher] Processing pending queue...');

    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      console.warn('[OfflineAccountSwitcher] PowerSync not ready');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Get all pending items
    const pendingItems = await powerSync.query<OfflineQueueItem>(
      `SELECT * FROM ${TABLES.OFFLINE_QUEUE} ORDER BY created_at ASC`,
    );

    console.log('[OfflineAccountSwitcher] Found', pendingItems.length, 'pending items');

    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        await this.processQueueItem(item);
        succeeded++;

        // Remove from queue on success
        await powerSync.execute(
          `DELETE FROM ${TABLES.OFFLINE_QUEUE} WHERE id = ?`,
          [item.id],
        );
      } catch (error) {
        console.error('[OfflineAccountSwitcher] Failed to process queue item:', error);
        failed++;

        // Increment retry count
        await powerSync.execute(
          `UPDATE ${TABLES.OFFLINE_QUEUE}
           SET retry_count = retry_count + 1,
               error = ?,
               attempted_at = datetime('now')
           WHERE id = ?`,
          [error instanceof Error ? error.message : 'Unknown error', item.id],
        );
      }
    }

    console.log('[OfflineAccountSwitcher] Queue processing complete:', {
      processed: pendingItems.length,
      succeeded,
      failed,
    });

    return {
      processed: pendingItems.length,
      succeeded,
      failed,
    };
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    const data = JSON.parse(item.data);

    if (item.table_name === TABLES.USERS && item.operation === 'update') {
      // Update user account type via API
      await apiClient.patch(`/api/user/${item.record_id}`, {
        accountType: data.accountType,
      });
    } else if (item.table_name === TABLES.USER_PROFILE_LOGS && item.operation === 'create') {
      // Create audit log via API
      await apiClient.post('/api/user-profile-logs', data);
    }

    console.log('[OfflineAccountSwitcher] ✅ Queue item processed:', item.id);
  }

  /**
   * Get pending queue count
   */
  async getPendingCount(): Promise<number> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      return 0;
    }

    const result = await powerSync.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.OFFLINE_QUEUE}`,
    );

    return result[0]?.count || 0;
  }

  /**
   * Get pending queue items
   */
  async getPendingItems(): Promise<OfflineQueueItem[]> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      return [];
    }

    return await powerSync.query<OfflineQueueItem>(
      `SELECT * FROM ${TABLES.OFFLINE_QUEUE} ORDER BY created_at ASC`,
    );
  }

  /**
   * Clear all pending items (for testing/debugging)
   */
  async clearQueue(): Promise<void> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      return;
    }

    await powerSync.execute(`DELETE FROM ${TABLES.OFFLINE_QUEUE}`);
    console.log('[OfflineAccountSwitcher] ✅ Queue cleared');
  }

  /**
   * Check if device is online
   */
  private async checkOnlineStatus(): Promise<boolean> {
    try {
      // Check PowerSync connection status
      const powerSync = PowerSyncService.getInstance();
      const status = powerSync.getSyncStatus();

      if (status.connected) {
        return true;
      }

      // Fallback: Try to get auth token
      const token = TokenStorage.getAuthToken();
      if (!token) {
        return false;
      }

      // Could add a ping to server here if needed
      return false; // Default to offline if PowerSync not connected
    } catch (error) {
      console.warn('[OfflineAccountSwitcher] Error checking online status:', error);
      return false;
    }
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get user's audit log history
   */
  async getUserAuditLogs(userId: string, limit: number = 10): Promise<UserProfileLog[]> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      return [];
    }

    const logs = await powerSync.query<any>(
      `SELECT * FROM ${TABLES.USER_PROFILE_LOGS}
       WHERE user_id = ?
       ORDER BY changed_at DESC
       LIMIT ?`,
      [userId, limit],
    );

    return logs.map((log) => ({
      id: log.id,
      userId: log.user_id,
      changedBy: log.changed_by,
      changedAt: log.changed_at,
      changes: JSON.parse(log.changes),
      isAdminAction: Boolean(log.is_admin_action),
      createdAt: log.created_at,
    }));
  }

  /**
   * Get recent account type changes
   */
  async getRecentAccountTypeChanges(limit: number = 5): Promise<UserProfileLog[]> {
    const powerSync = PowerSyncService.getInstance();

    if (!powerSync.isReady()) {
      return [];
    }

    const logs = await powerSync.query<any>(
      `SELECT * FROM ${TABLES.USER_PROFILE_LOGS}
       WHERE changes LIKE '%accountType%'
       ORDER BY changed_at DESC
       LIMIT ?`,
      [limit],
    );

    return logs.map((log) => ({
      id: log.id,
      userId: log.user_id,
      changedBy: log.changed_by,
      changedAt: log.changed_at,
      changes: JSON.parse(log.changes),
      isAdminAction: Boolean(log.is_admin_action),
      createdAt: log.created_at,
    }));
  }
}

// Export singleton instance
export const offlineAccountSwitcher = OfflineAccountSwitcherService.getInstance();
