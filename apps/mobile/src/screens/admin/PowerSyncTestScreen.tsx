// apps/mobile/src/screens/admin/PowerSyncTestScreen.tsx
// Test screen to verify PowerSync admin data synchronization

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { PowerSyncService } from '../../services/powersync/PowerSyncService';
import { useThemeColors } from '../../contexts/ThemeContext';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  Settings,
  Bell,
  Upload,
  Clock,
} from 'lucide-react-native';
import { offlineAccountSwitcher } from '../../services/powersync/OfflineAccountSwitcherService';

interface SyncStats {
  totalUsers: number;
  pendingSignups: number;
  authorizedUsers: number;
  admins: number;
  userSettings: number;
  notifications: number;
  profileLogs: number;
}

interface QueueStats {
  pendingCount: number;
  items: any[];
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
  authorized: number;
  created_at: string;
}

export default function PowerSyncTestScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SyncStats>({
    totalUsers: 0,
    pendingSignups: 0,
    authorizedUsers: 0,
    admins: 0,
    userSettings: 0,
    notifications: 0,
    profileLogs: 0,
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pendingCount: 0,
    items: [],
  });

  const loadData = async () => {
    try {
      setError(null);
      const powerSync = PowerSyncService.getInstance();

      if (!powerSync.isReady()) {
        setError('PowerSync not initialized. Please login as an admin.');
        return;
      }

      const db = powerSync.getDatabase();
      if (!db) {
        setError('PowerSync database not available');
        return;
      }

      // Get sync status
      const status = powerSync.getSyncStatus();
      setSyncStatus(status);

      // Query statistics
      const totalUsersResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM users',
      );

      const pendingResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM users WHERE authorized = 0',
      );

      const authorizedResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM users WHERE authorized = 1',
      );

      const adminsResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM admins',
      );

      const settingsResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_settings',
      );

      const notificationsResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM admin_notifications',
      );

      const profileLogsResult = await powerSync.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_profile_logs',
      );

      setStats({
        totalUsers: totalUsersResult[0]?.count || 0,
        pendingSignups: pendingResult[0]?.count || 0,
        authorizedUsers: authorizedResult[0]?.count || 0,
        admins: adminsResult[0]?.count || 0,
        userSettings: settingsResult[0]?.count || 0,
        notifications: notificationsResult[0]?.count || 0,
        profileLogs: profileLogsResult[0]?.count || 0,
      });

      // Get offline queue stats
      const pendingCount = await offlineAccountSwitcher.getPendingCount();
      const queueItems = await offlineAccountSwitcher.getPendingItems();
      setQueueStats({
        pendingCount,
        items: queueItems.slice(0, 5), // Only show first 5
      });

      // Get recent pending signups
      const users = await powerSync.query<User>(
        'SELECT * FROM users WHERE authorized = 0 ORDER BY created_at DESC LIMIT 5',
      );
      setRecentUsers(users);

      console.log('✅ PowerSync Test - Data loaded successfully');
      console.log('📊 Stats:', stats);
      console.log('👤 Recent users:', users.length);
    } catch (err) {
      console.error('❌ PowerSync Test - Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    try {
      setLoading(true);
      setError(null);

      const powerSync = PowerSyncService.getInstance();
      await powerSync.sync();

      await loadData();

      console.log('✅ Manual sync completed');
    } catch (err) {
      console.error('❌ Manual sync failed:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await offlineAccountSwitcher.processPendingQueue();

      console.log('✅ Queue processing completed:', result);

      await loadData();
    } catch (err) {
      console.error('❌ Queue processing failed:', err);
      setError(err instanceof Error ? err.message : 'Queue processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    try {
      setLoading(true);
      await offlineAccountSwitcher.clearQueue();
      await loadData();
      console.log('✅ Queue cleared');
    } catch (err) {
      console.error('❌ Queue clear failed:', err);
      setError(err instanceof Error ? err.message : 'Queue clear failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };

    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styles = createStyles(colors);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading PowerSync data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PowerSync Test</Text>
        <Text style={styles.subtitle}>Admin Data Synchronization</Text>
      </View>

      {/* Sync Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sync Status</Text>
          {syncStatus?.connected ? (
            <CheckCircle size={20} color={colors.success} />
          ) : (
            <XCircle size={20} color={colors.error} />
          )}
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connected:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: syncStatus?.connected ? colors.success : colors.error },
            ]}
          >
            {syncStatus?.connected ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Synced:</Text>
          <Text style={styles.statusValue}>
            {syncStatus?.lastSyncedAt
              ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString()
              : 'Never'}
          </Text>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorCard}>
          <XCircle size={20} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Users size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>

        <View style={styles.statCard}>
          <Users size={24} color={colors.warning} />
          <Text style={styles.statValue}>{stats.pendingSignups}</Text>
          <Text style={styles.statLabel}>Pending Signups</Text>
        </View>

        <View style={styles.statCard}>
          <CheckCircle size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.authorizedUsers}</Text>
          <Text style={styles.statLabel}>Authorized</Text>
        </View>

        <View style={styles.statCard}>
          <Shield size={24} color={colors.info} />
          <Text style={styles.statValue}>{stats.admins}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>

        <View style={styles.statCard}>
          <Settings size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.userSettings}</Text>
          <Text style={styles.statLabel}>Settings</Text>
        </View>

        <View style={styles.statCard}>
          <Bell size={24} color={colors.error} />
          <Text style={styles.statValue}>{stats.notifications}</Text>
          <Text style={styles.statLabel}>Notifications</Text>
        </View>

        <View style={styles.statCard}>
          <Clock size={24} color={colors.warning} />
          <Text style={styles.statValue}>{stats.profileLogs}</Text>
          <Text style={styles.statLabel}>Profile Logs</Text>
        </View>
      </View>

      {/* Offline Queue Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Offline Queue</Text>
          {queueStats.pendingCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.warning }]}>
                {queueStats.pendingCount} pending
              </Text>
            </View>
          ) : (
            <CheckCircle size={20} color={colors.success} />
          )}
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Pending Items:</Text>
          <Text style={styles.statusValue}>{queueStats.pendingCount}</Text>
        </View>
        {queueStats.items.length > 0 && (
          <>
            <Text
              style={[styles.statusLabel, { marginTop: 12, marginBottom: 8 }]}
            >
              Recent Queue Items:
            </Text>
            {queueStats.items.map((item, index) => {
              const data = JSON.parse(item.data);
              return (
                <View key={item.id || index} style={styles.queueItem}>
                  <View style={styles.queueItemHeader}>
                    <Text style={styles.queueItemOperation}>
                      {item.operation.toUpperCase()}
                    </Text>
                    <Text style={styles.queueItemTable}>{item.table_name}</Text>
                  </View>
                  <Text style={styles.queueItemData}>
                    {data.accountType
                      ? `Account Type: ${data.oldAccountType} → ${data.accountType}`
                      : 'Profile Change'}
                  </Text>
                  <Text style={styles.queueItemMeta}>
                    Retry: {item.retry_count} • Created:{' '}
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>

      {/* Recent Pending Signups */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Pending Signups</Text>
        {recentUsers.length === 0 ? (
          <Text style={styles.emptyText}>No pending signups found</Text>
        ) : (
          recentUsers.map((user, index) => (
            <View key={user.id || index} style={styles.userItem}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userMeta}>
                  {user.account_type} •{' '}
                  {new Date(user.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>
                  Pending
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleManualSync}
          disabled={loading}
        >
          <RefreshCw size={20} color={colors.textInverse} />
          <Text style={styles.buttonText}>
            {loading ? 'Syncing...' : 'Force Sync'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleRefresh}
        >
          <RefreshCw size={20} color={colors.primary} />
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Queue Actions */}
      {queueStats.pendingCount > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleProcessQueue}
            disabled={loading}
          >
            <Upload size={20} color={colors.textInverse} />
            <Text style={styles.buttonText}>Process Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleClearQueue}
            disabled={loading}
          >
            <XCircle size={20} color={colors.textInverse} />
            <Text style={styles.buttonText}>Clear Queue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug Info */}
      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>Debug Info</Text>
        <Text style={styles.debugText}>
          PowerSync Ready:{' '}
          {PowerSyncService.getInstance().isReady() ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.debugText}>
          Database:{' '}
          {PowerSyncService.getInstance().getDatabase()
            ? 'Available'
            : 'Not Available'}
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    card: {
      margin: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    statusLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      padding: 16,
      backgroundColor: colors.error + '10',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error + '30',
    },
    errorText: {
      marginLeft: 12,
      flex: 1,
      fontSize: 14,
      color: colors.errorDark,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
    },
    statCard: {
      width: '31%',
      margin: '1%',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    userItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    userMeta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 20,
    },
    actions: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textInverse,
    },
    buttonDanger: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    queueItem: {
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    queueItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    queueItemOperation: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    queueItemTable: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
    queueItemData: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
    },
    queueItemMeta: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    debugCard: {
      margin: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.7,
    },
    debugTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    debugText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
      fontFamily: 'monospace',
    },
  });
}
