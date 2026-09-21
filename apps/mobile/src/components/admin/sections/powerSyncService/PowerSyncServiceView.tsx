// apps/mobile/src/components/admin/sections/powerSyncService/PowerSyncServiceView.tsx
// View for PowerSync service health monitoring

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Cloud,
  Smartphone,
  Clock,
  Zap,
  WifiOff,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { usePowerSyncViewModel } from '../../../../viewModels/admin/usePowerSyncViewModel';
import { usePowerSync, usePowerSyncQuery } from '../../../../hooks/powersync';
import { TABLES } from '../../../../db';
import { Card, CardContent, CardHeader } from '../../../ui';

export default function PowerSyncServiceView() {
  const colors = useThemeColors();
  const {
    healthData,
    localSyncStatus,
    isLoading,
    isRefreshing,
    error,
    autoRefresh,
    toggleAutoRefresh,
    lastChecked,
    refreshHealth,
    getStatusColor,
    getStatusText,
  } = usePowerSyncViewModel();

  const { isInitialized } = usePowerSync();

  // Query offline_access feedback from local PowerSync DB
  const issuesQuery = usePowerSyncQuery<{
    id: string;
    title: string;
    description: string;
    status: string;
    sync_diagnostics: string | null;
    created_at: string;
    user_id: string;
  }>(
    `SELECT id, title, description, status, sync_diagnostics, created_at, user_id
     FROM ${TABLES.USER_FEEDBACK}
     WHERE category = 'offline_access'
     ORDER BY created_at DESC
     LIMIT 10`,
    [],
    { enabled: isInitialized, retry: 1 },
  );

  const clientIssues = useMemo(() => {
    return (issuesQuery.data || []).map(row => {
      let diag = null;
      if (row.sync_diagnostics) {
        try { diag = JSON.parse(row.sync_diagnostics); } catch { /* ignore */ }
      }
      return { ...row, syncDiagnostics: diag };
    });
  }, [issuesQuery.data]);

  const statusText = getStatusText();
  const isHealthy = healthData?.ready && healthData?.started;

  // Render status badge
  const renderStatusBadge = (healthy: boolean, text: string) => {
    const statusColor = getStatusColor(healthy);
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
        {healthy ? (
          <CheckCircle size={16} color={statusColor} />
        ) : (
          <XCircle size={16} color={statusColor} />
        )}
        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
          {text}
        </Text>
      </View>
    );
  };

  // Render loading state
  if (isLoading && !healthData) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Loader2 size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking PowerSync service...
        </Text>
      </View>
    );
  }

  // Render error state
  if (error && !healthData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorState}>
          <AlertCircle size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Service Unavailable
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={refreshHealth}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshHealth}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Server Status Card */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Cloud size={24} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Server Status
            </Text>
            {renderStatusBadge(isHealthy ?? false, statusText)}
          </View>
        </CardHeader>
        <CardContent>
          {healthData && (
            <>
              <View style={styles.statusGrid}>
                <View style={[styles.statusItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.statusItemLabel, { color: colors.textSecondary }]}>
                    Ready
                  </Text>
                  <View style={styles.statusItemValue}>
                    {healthData.ready ? (
                      <CheckCircle size={24} color={colors.success} />
                    ) : (
                      <XCircle size={24} color={colors.error} />
                    )}
                  </View>
                </View>
                <View style={[styles.statusItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.statusItemLabel, { color: colors.textSecondary }]}>
                    Started
                  </Text>
                  <View style={styles.statusItemValue}>
                    {healthData.started ? (
                      <CheckCircle size={24} color={colors.success} />
                    ) : (
                      <XCircle size={24} color={colors.error} />
                    )}
                  </View>
                </View>
              </View>

              {healthData.duration !== undefined && (
                <View style={styles.infoRow}>
                  <View style={styles.infoRowIcon}>
                    <Zap size={16} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Response Time
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {healthData.duration}ms
                  </Text>
                </View>
              )}

              {healthData.touched_at && (
                <View style={styles.infoRow}>
                  <View style={styles.infoRowIcon}>
                    <Clock size={16} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Last Activity
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(healthData.touched_at).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <View style={styles.infoRowIcon}>
                  <RefreshCw size={16} color={colors.textSecondary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Last Checked
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {lastChecked?.toLocaleTimeString() || 'Never'}
                </Text>
              </View>
            </>
          )}

          {/* Auto-refresh toggle */}
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              Auto-refresh (30s)
            </Text>
            <Switch
              value={autoRefresh}
              onValueChange={toggleAutoRefresh}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={autoRefresh ? colors.primary : colors.textSecondary}
            />
          </View>
        </CardContent>
      </Card>

      {/* Local Sync Status Card */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Smartphone size={24} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Local Sync Status
            </Text>
            {localSyncStatus && renderStatusBadge(
              localSyncStatus.isConnected,
              localSyncStatus.isConnected ? 'Connected' : 'Disconnected'
            )}
          </View>
        </CardHeader>
        <CardContent>
          {localSyncStatus ? (
            <>
              <View style={styles.statusGrid}>
                <View style={[styles.statusItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.statusItemLabel, { color: colors.textSecondary }]}>
                    Connected
                  </Text>
                  <View style={styles.statusItemValue}>
                    {localSyncStatus.isConnected ? (
                      <CheckCircle size={24} color={colors.success} />
                    ) : (
                      <XCircle size={24} color={colors.error} />
                    )}
                  </View>
                </View>
                <View style={[styles.statusItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.statusItemLabel, { color: colors.textSecondary }]}>
                    Ready
                  </Text>
                  <View style={styles.statusItemValue}>
                    {localSyncStatus.isReady ? (
                      <CheckCircle size={24} color={colors.success} />
                    ) : (
                      <XCircle size={24} color={colors.error} />
                    )}
                  </View>
                </View>
              </View>

              {localSyncStatus.lastSyncTime && (
                <View style={styles.infoRow}>
                  <View style={styles.infoRowIcon}>
                    <Clock size={16} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Last Sync
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {localSyncStatus.lastSyncTime.toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                Local sync status unavailable
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Client Sync Issues Card */}
      {clientIssues.length > 0 && (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <WifiOff size={24} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Client Sync Issues
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.statusBadgeText, { color: colors.warning }]}>
                  {clientIssues.length}
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent>
            {clientIssues.map((issue, idx) => (
              <View
                key={issue.id}
                style={[
                  styles.issueItem,
                  idx < clientIssues.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.issueHeader}>
                  <Text style={[styles.issueTitle, { color: colors.text }]} numberOfLines={1}>
                    {issue.title}
                  </Text>
                  <View style={[styles.issueStatusBadge, {
                    backgroundColor: issue.status === 'open' ? colors.error + '10' : colors.backgroundTertiary,
                  }]}>
                    <Text style={[styles.issueStatusText, {
                      color: issue.status === 'open' ? colors.error : colors.textSecondary,
                    }]}>
                      {issue.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.issueDate, { color: colors.textTertiary }]}>
                  {new Date(issue.created_at).toLocaleDateString()}
                </Text>
                {issue.syncDiagnostics && (
                  <View style={styles.issueDiagRow}>
                    <Text style={[styles.issueDiagText, {
                      color: issue.syncDiagnostics.connectionTimedOut ? colors.error : colors.textSecondary,
                    }]}>
                      {issue.syncDiagnostics.connectionTimedOut ? 'Timed out' : 'Disconnected'}
                      {issue.syncDiagnostics.devicePlatform ? ` (${issue.syncDiagnostics.devicePlatform})` : ''}
                      {issue.syncDiagnostics.pendingChanges > 0 ? ` · ${issue.syncDiagnostics.pendingChanges} pending` : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <CardHeader>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            About PowerSync
          </Text>
        </CardHeader>
        <CardContent>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            PowerSync provides real-time data synchronization between your device and the server.
            When offline, changes are queued locally and automatically synced when connectivity is restored.
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Offline-first architecture
              </Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Automatic conflict resolution
              </Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Real-time updates
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.base,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  card: {
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statusItemLabel: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  statusItemValue: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoRowIcon: {
    width: 24,
    alignItems: 'center',
  },
  infoLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    marginLeft: spacing.sm,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: spacing.md,
  },
  toggleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  noDataContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: typography.fontSize.base,
  },
  infoText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.md,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: typography.fontSize.base,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  issueItem: {
    paddingVertical: spacing.md,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  issueTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
    marginRight: spacing.sm,
  },
  issueStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  issueStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  issueDate: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  issueDiagRow: {
    marginTop: spacing.xs,
  },
  issueDiagText: {
    fontSize: typography.fontSize.sm,
  },
});
