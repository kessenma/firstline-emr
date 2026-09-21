// Bottom sheet showing PowerSync data sync status and local data counts.
// Field doctors can compare counts with colleagues to verify they have the same data.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
} from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import {
  RefreshCw,
  Trash2,
  Users,
  FileText,
  Pill,
  Syringe,
  Image,
  MessageCircle,
  MessagesSquare,
  Send,
  Globe,
  UserCheck,
  CalendarSync,
  MessageSquareWarning,
  Smartphone,
  CloudDownload,
  ExternalLink,
  ChevronRight,
} from 'lucide-react-native';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Shackle path length (V7 leg=3 + arc≈15.7 + v3 leg=3) — padded to 30
const SHACKLE_LENGTH = 30;

// Lock SVG stays at a fixed size; phone is independently sized 3× larger.
// The lock is centered absolutely over the phone — no scaling of lock elements.
const LOCK_SVG_SIZE = 28;
const PHONE_ICON_SIZE = LOCK_SVG_SIZE * 3; // 84px

// Self-contained badge — animation starts on mount, stops on unmount.
// Mount it only when visible so it uses no resources when hidden.
function EncryptedBadge({
  successColor,
  errorColor,
  textColor,
  textSecondaryColor,
  onReadMore,
  styles: s,
}: {
  successColor: string;
  errorColor: string;
  textColor: string;
  textSecondaryColor: string;
  onReadMore: () => void;
  styles: {
    encryptedBadgeWrapper: object;
    encryptedBadge: object;
    encryptedText: object;
    encryptedReadMore: object;
    encryptedReadMoreText: object;
  };
}) {
  const lockProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(2500),
        Animated.timing(lockProgress, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.delay(400),
        Animated.timing(lockProgress, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [lockProgress]);

  const dashOffset = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [0, SHACKLE_LENGTH] });
  const strokeColor = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [successColor, errorColor] });
  const badgeBorder = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [successColor, successColor + '00'] });
  const badgeTextColor = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [successColor, errorColor] });

  return (
    <View style={s.encryptedBadgeWrapper}>
      <Animated.View style={[s.encryptedBadge, { borderColor: badgeBorder }]}>
        <CloudDownload size={PHONE_ICON_SIZE} color={textColor} />

        {/* Phone with animated lock overlay */}
        <View style={{ width: PHONE_ICON_SIZE, height: PHONE_ICON_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Smartphone size={PHONE_ICON_SIZE} color={textColor} />
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Svg width={LOCK_SVG_SIZE} height={LOCK_SVG_SIZE} viewBox="0 0 24 24" fill="none">
              <AnimatedRect x="3" y="10" width="18" height="12" rx="2" stroke={strokeColor as any} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <AnimatedCircle cx="12" cy="16" r="1" stroke={strokeColor as any} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <AnimatedPath d="M7 10V7a5 5 0 0 1 10 0v3" stroke={strokeColor as any} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={String(SHACKLE_LENGTH)} strokeDashoffset={dashOffset} />
            </Svg>
          </View>
        </View>

        <Animated.Text style={[s.encryptedText, { color: badgeTextColor }]}>
          Data encrypted on device
        </Animated.Text>
        <TouchableOpacity style={s.encryptedReadMore} onPress={onReadMore} activeOpacity={0.7}>
          <Text style={[s.encryptedReadMoreText, { color: textSecondaryColor }]}>Read more about the encryption SDK</Text>
          <ExternalLink size={12} color={textSecondaryColor} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { AccordionItem } from '../../../components/ui/Accordion';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useTranscriptionJobs } from '../../../contexts/TranscriptionJobsContext';
import { goToPatientChart } from '../../../utils/navigateToPatientChart';
import { useSyncStatus } from '../../../hooks/powersync';
import { useSyncDataSummary, type SyncDataCounts } from '../../../hooks/powersync/useSyncDataSummary';
import { PowerSyncService } from '../../../services/powersync/PowerSyncService';
import { gatherSyncDiagnostics, type SyncDiagnosticSnapshot } from '../../../utils/gatherSyncDiagnostics';

interface SyncStatusSheetProps {
  visible: boolean;
  onClose: () => void;
  onReportIssue?: (diagnostics: SyncDiagnosticSnapshot) => void;
}

// Table display config
interface TableDisplayInfo {
  key: keyof SyncDataCounts;
  label: string;
  icon: React.ReactNode;
}

function getRelativeTime(date: Date | undefined): string {
  if (!date) return 'Never';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export const SyncStatusSheet: React.FC<SyncStatusSheetProps> = ({
  visible,
  onClose,
  onReportIssue,
}) => {
  const colors = useThemeColors();
  const {
    isConnected,
    isConnecting,
    connectionTimedOut,
    isDownloading,
    isUploading,
    lastSyncTime,
    syncErrors,
    downloadProgress,
  } = useSyncStatus({ enableDetailedLogging: false });
  const { counts, isLoading: isCountsLoading } = useSyncDataSummary();

  // Transcription jobs are app-level, so they are visible here even though the
  // call that produced them happened on a screen the clinician has long left.
  const { jobs } = useTranscriptionJobs();
  const transcriptionJobs = jobs.filter(
    job => job.status === 'transcribing' || job.status === 'failed' || job.status === 'pending',
  );

  const isSyncing = isDownloading || isUploading;

  // The fraction reaches 1.0 while the SDK is still applying the downloaded
  // changes locally — downloadProgress only clears afterwards. Showing a stalled
  // "100%" there reads as a hang, so name what is actually happening instead.
  const isApplyingChanges =
    downloadProgress != null &&
    downloadProgress.totalOperations > 0 &&
    downloadProgress.downloadedOperations >= downloadProgress.totalOperations;

  const downloadPercent =
    downloadProgress != null ? Math.round(downloadProgress.downloadedFraction * 100) : null;

  // Connection status — using theme colors
  let statusColor: string = colors.textSecondary; // offline/gray
  let statusText = 'Offline';
  if (isConnected && isSyncing) {
    statusColor = colors.warning;
    if (isDownloading) {
      if (isApplyingChanges) {
        statusText = 'Applying changes...';
      } else if (downloadPercent != null) {
        statusText = `Downloading data... ${downloadPercent}%`;
      } else {
        statusText = 'Downloading data...';
      }
    } else {
      statusText = 'Uploading changes...';
    }
  } else if (isConnected) {
    statusColor = colors.success;
    statusText = 'Connected';
  } else if (isConnecting) {
    statusColor = colors.warning;
    statusText = 'Connecting...';
  } else if (connectionTimedOut) {
    statusColor = colors.error;
    statusText = 'Connection Failed';
  }

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  const handleReconnect = async () => {
    if (isReconnecting) return;
    setIsReconnecting(true);
    setReconnectError(null);
    try {
      await PowerSyncService.getInstance().reconnect();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reconnect failed';
      setReconnectError(message);
      console.error('Reconnect failed:', err);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Pending changes count — poll every 5s while sheet is visible (Phase 5.1)
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const fetchPendingCount = async () => {
      try {
        const count = await PowerSyncService.getInstance().getPendingChangesCount();
        setPendingCount(count);
      } catch {
        // Silently ignore — the count is informational
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5000);
    return () => clearInterval(interval);
  }, [visible]);


  const [resetCooldown, setResetCooldown] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick down the cooldown every second
  useEffect(() => {
    if (resetCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResetCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
      };
    }
  }, [resetCooldown > 0]);

  const handleResetLocalData = () => {
    Alert.alert(
      'Reset Local Data',
      'This will delete all local data and re-download everything from the server. This may take a moment depending on your connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await PowerSyncService.getInstance().resetLocalDatabase();
            } catch (err) {
              console.error('Reset failed:', err);
            } finally {
              setIsResetting(false);
              setResetCooldown(60);
            }
          },
        },
      ],
    );
  };

  const handleReportIssue = async () => {
    if (!onReportIssue) return;
    const diagnostics = await gatherSyncDiagnostics(
      { ...counts },
      syncErrors,
      connectionTimedOut,
      lastSyncTime,
    );
    onReportIssue(diagnostics);
  };

  const iconColor = colors.textSecondary;
  const iconSize = 18;

  const tables: TableDisplayInfo[] = [
    { key: 'users', label: 'Users', icon: <Users size={iconSize} color={iconColor} /> },
    { key: 'patients', label: 'Patients', icon: <FileText size={iconSize} color={iconColor} /> },
    { key: 'notes', label: 'Clinical Notes', icon: <FileText size={iconSize} color={iconColor} /> },
    { key: 'rx_orders', label: 'Prescriptions', icon: <Pill size={iconSize} color={iconColor} /> },
    { key: 'med_orders', label: 'Medication Orders', icon: <Syringe size={iconSize} color={iconColor} /> },
    { key: 'patient_media', label: 'Patient Photos', icon: <Image size={iconSize} color={iconColor} /> },
    { key: 'internal_message_threads', label: 'Staff Threads', icon: <MessagesSquare size={iconSize} color={iconColor} /> },
    { key: 'internal_messages', label: 'Staff Messages', icon: <MessageCircle size={iconSize} color={iconColor} /> },
    { key: 'telegram_threads', label: 'Patient Threads', icon: <Send size={iconSize} color={iconColor} /> },
    { key: 'telegram_messages', label: 'Patient Messages', icon: <Send size={iconSize} color={iconColor} /> },
    { key: 'missions', label: 'Missions', icon: <Globe size={iconSize} color={iconColor} /> },
    { key: 'patient_care_team', label: 'Care Team', icon: <UserCheck size={iconSize} color={iconColor} /> },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Data Sync"
      snapPoint={80}
      showHandle={true}
      showCloseButton={true}
    >
      <>
        {/* Info accordion */}
        <View style={[styles.infoContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <AccordionItem
            title="How offline sync works"
            headerStyle={styles.infoHeader}
            contentStyle={styles.infoContent}
          >
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              This app uses PowerSync to download your patient data locally to your device. Once synced, you can view and record patient information even without an internet connection. Any changes you make offline are queued and automatically uploaded when connectivity is restored.
            </Text>
            <TouchableOpacity
              style={styles.infoLink}
              onPress={() => Linking.openURL('https://www.powersync.com')}
              activeOpacity={0.7}
            >
              <Text style={[styles.infoLinkText, { color: colors.primary }]}>Learn more at powersync.com</Text>
              <ExternalLink size={12} color={colors.primary} />
            </TouchableOpacity>

            {/* Encryption badge — mounts/unmounts with accordion, animation auto starts/stops */}
            <EncryptedBadge
              successColor={colors.success}
              errorColor={colors.error}
              textColor={colors.text}
              textSecondaryColor={colors.textSecondary}
              onReadMore={() => Linking.openURL('https://docs.powersync.com/client-sdks/advanced/data-encryption')}
              styles={styles}
            />
          </AccordionItem>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '12', borderColor: statusColor + '30' }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: colors.text }]}>{statusText}</Text>
            {(isSyncing || isConnecting) && (
              <ActivityIndicator size="small" color={statusColor} style={styles.statusSpinner} />
            )}
          </View>
          {downloadProgress != null && !isApplyingChanges && (
            <View style={styles.syncProgressTrack}>
              <View
                style={[
                  styles.syncProgressFill,
                  {
                    backgroundColor: statusColor,
                    width: `${Math.min(100, Math.max(0, downloadProgress.downloadedFraction * 100))}%`,
                  },
                ]}
              />
            </View>
          )}
          {downloadProgress != null && (
            <Text style={[styles.lastSyncText, { color: colors.textSecondary }]}>
              {downloadProgress.downloadedOperations.toLocaleString()} of{' '}
              {downloadProgress.totalOperations.toLocaleString()} operations
            </Text>
          )}
          <Text style={[styles.lastSyncText, { color: colors.textSecondary }]}>
            Last synced: {getRelativeTime(lastSyncTime)}
          </Text>
        </View>

        {/* Error detail when connection failed */}
        {connectionTimedOut && syncErrors.length > 0 && (
          <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={2}>
            {syncErrors[syncErrors.length - 1]?.message || 'Unable to reach sync server'}
          </Text>
        )}

        {/* Reconnect button when offline or connection failed */}
        {!isConnected && !isConnecting && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.reconnectButton,
                { backgroundColor: isReconnecting ? colors.primary + '80' : colors.primary },
              ]}
              onPress={handleReconnect}
              disabled={isReconnecting}
              activeOpacity={0.8}
            >
              {isReconnecting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <RefreshCw size={16} color={colors.textInverse} />
              )}
              <Text style={[styles.reconnectText, { color: colors.textInverse }]}>
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </Text>
            </TouchableOpacity>
            {onReportIssue && (
              <TouchableOpacity
                style={[styles.reportButton, { borderColor: colors.error }]}
                onPress={handleReportIssue}
                activeOpacity={0.8}
              >
                <MessageSquareWarning size={16} color={colors.error} />
                <Text style={[styles.reportButtonText, { color: colors.error }]}>
                  Report Issue
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Inline reconnect error */}
        {reconnectError && (
          <Text style={[styles.errorText, { color: colors.error, marginBottom: spacing.sm }]}>
            {reconnectError}
          </Text>
        )}

        {/* Pending changes count (Phase 5.1) */}
        {pendingCount > 0 && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
            <Text style={[styles.pendingText, { color: colors.text }]}>
              {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending upload
            </Text>
          </View>
        )}

        {/* Transcription jobs. Shown above LOCAL DATA because it is the only
            section here that is actionable — a failed job needs a decision. */}
        {transcriptionJobs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <FileText size={14} color={colors.textSecondary} />
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  CALL NOTES
                </Text>
              </View>
            </View>

            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              {transcriptionJobs.map(job => (
                <TouchableOpacity
                  key={job.jobId}
                  style={[
                    styles.transcriptionRow,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    goToPatientChart(job.patientId);
                  }}
                >
                  <View style={styles.transcriptionInfo}>
                    <Text
                      style={[styles.transcriptionName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {job.patientName}
                    </Text>
                    <Text
                      style={[
                        styles.transcriptionStatusText,
                        {
                          color:
                            job.status === 'failed'
                              ? colors.error
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {job.status === 'transcribing'
                        ? `Writing notes… ${Math.round(job.progress * 100)}%`
                        : job.status === 'failed'
                          ? 'Failed — tap to retry'
                          : 'Waiting'}
                    </Text>
                    {job.status === 'transcribing' && (
                      <View
                        style={[
                          styles.progressTrack,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: colors.primary,
                              width: `${Math.round(job.progress * 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Data Counts */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <CalendarSync size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              LOCAL DATA
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
            Synced in the last 24 hours
          </Text>
        </View>

        {isCountsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading counts...
            </Text>
          </View>
        ) : (
          <View style={[styles.countsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {tables.map((table, index) => (
              <View
                key={table.key}
                style={[
                  styles.countRow,
                  index < tables.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.countRowLeft}>
                  <View style={[styles.countIcon, { backgroundColor: colors.primary + '10' }]}>
                    {table.icon}
                  </View>
                  <Text style={[styles.countLabel, { color: colors.text }]}>{table.label}</Text>
                </View>
                <Text style={[styles.countValue, { color: colors.text }]}>
                  {counts[table.key].toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Reset Local Data */}
        <TouchableOpacity
          style={[
            styles.resetButton,
            { borderColor: colors.error + '60' },
            (resetCooldown > 0 || isResetting) && styles.resetButtonDisabled,
          ]}
          onPress={handleResetLocalData}
          disabled={resetCooldown > 0 || isResetting}
          activeOpacity={0.8}
        >
          {isResetting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Trash2 size={16} color={resetCooldown > 0 ? colors.textTertiary : colors.error} />
          )}
          <Text
            style={[
              styles.resetButtonText,
              { color: resetCooldown > 0 ? colors.textTertiary : colors.error },
            ]}
          >
            {isResetting
              ? 'Resetting...'
              : resetCooldown > 0
                ? `Reset Local Data (${resetCooldown}s)`
                : 'Reset Local Data'}
          </Text>
        </TouchableOpacity>
      </>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  statusBanner: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.base,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  statusSpinner: {
    marginLeft: spacing.sm,
  },
  lastSyncText: {
    fontSize: typography.fontSize.sm,
    marginLeft: 10 + spacing.sm, // Align with text after dot
  },
  // Distinct from progressTrack/progressFill below, which belong to the
  // transcription-jobs rows.
  syncProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127, 127, 127, 0.2)',
    marginLeft: 10 + spacing.sm, // Align with text after dot
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  syncProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  actionButtons: {
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  reconnectText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  reportButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  transcriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  transcriptionInfo: { flex: 1, gap: 3 },
  transcriptionName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  transcriptionStatusText: { fontSize: typography.fontSize.xs },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  sectionTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
  },
  countsContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  countRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  countLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  countValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    minWidth: 40,
    textAlign: 'right',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.base,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  pendingBanner: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.base,
  },
  pendingText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  encryptedBadgeWrapper: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  encryptedBadge: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  encryptedText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  encryptedReadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  encryptedReadMoreText: {
    fontSize: typography.fontSize.xs,
  },
  infoContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  infoHeader: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  infoContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  infoLinkText: {
    fontSize: typography.fontSize.sm,
  },
});

export default SyncStatusSheet;
