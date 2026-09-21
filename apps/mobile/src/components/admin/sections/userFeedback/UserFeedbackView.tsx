// apps/mobile/src/components/admin/sections/userFeedback/UserFeedbackView.tsx
// Admin view for managing user feedback submissions

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Search,
  Paperclip,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Monitor,
  FileText,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { TABLES } from '../../../../db';
import { getApiUrl } from '../../../../config';
import { TokenStorage } from '../../../../services/TokenStorage';
import { PowerSyncService } from '../../../../services/powersync/PowerSyncService';
import { fetchMedia } from '../../../../services/MediaService';
import type { DbService } from '../../../../services/MediaService';
import { usePowerSync, usePowerSyncQuery } from '../../../../hooks/powersync';
import { MediaThumbnail } from '../../../ui/MediaThumbnail';
import { FullScreenMediaViewer } from '../../../ui/FullScreenMediaViewer';
import type { MediaThumbnailItem } from '../../../ui/MediaThumbnail';
import { BottomSheet } from '../../../BottomSheet';

interface SyncDiagnostics {
  tableCounts: Record<string, number>;
  isConnected: boolean;
  connectionTimedOut: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  errors: string[];
  serverUrl: string;
  devicePlatform: string;
}

interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  title: string;
  description: string;
  attachments: Array<{
    filePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;
  appSections: string[];
  platform: 'mobile' | 'web' | 'both' | null;
  mobilePlatform: 'ios' | 'android' | null;
  status: string;
  adminNotes: string | null;
  threadId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  syncDiagnostics: SyncDiagnostics | null;
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbFeedbackRow {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  attachments: string | null;
  app_sections: string | null;
  sync_diagnostics: string | null;
  app_version: string | null;
  platform: 'mobile' | 'web' | 'both' | null;
  mobile_platform: 'ios' | 'android' | null;
  status: string;
  admin_notes: string | null;
  thread_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbUserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const APP_SECTION_LABELS: Record<string, string> = {
  'patient_chart.patient_info': 'Patient Info',
  'patient_chart.media_gallery': 'Media Gallery',
  'patient_chart.telegram_thread': 'Telegram Thread',
  'patient_chart.video_calling': 'Video Calling',
  'patient_chart.medications': 'Medications',
  'patient_chart.notes': 'Clinical Notes',
  'patient_chart.rx_orders': 'Rx Orders',
  'patient_dashboard.filtering': 'Dashboard Filtering',
  'patient_dashboard.priority_status': 'Priority / Status / Specialty',
  user_profile: 'User Profile',
  user_settings: 'User Settings',
  staff_messaging: 'Staff Messaging',
  admin_dashboard: 'Admin Dashboard',
  notifications: 'Notifications',
  login_auth: 'Login & Auth',
  general: 'General',
  other_section: 'Other',
};

const CATEGORY_LABELS: Record<string, string> = {
  feature_request: 'Feature Request',
  bug: 'Bug',
  question: 'Question',
  admin_assistance: 'Admin Assist',
  ui_improvement: 'UI Improvement',
  praise: 'Praise',
  offline_access: 'Offline Access',
  other: 'Other',
};

const STATUS_OPTIONS = ['open', 'in_review', 'resolved', 'closed'] as const;

const getStatusColors = (colors: ReturnType<typeof useThemeColors>) => ({
  open: { bg: colors.info + '20', text: colors.info },
  in_review: { bg: colors.warning + '20', text: colors.warningDark },
  resolved: { bg: colors.success + '20', text: colors.successDark },
  closed: { bg: colors.backgroundTertiary, text: colors.textSecondary },
} as Record<string, { bg: string; text: string }>);

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function UserFeedbackView() {
  const colors = useThemeColors();
  const STATUS_COLORS = getStatusColors(colors);
  const { isInitialized } = usePowerSync();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({});
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [reopenDetailAfterViewer, setReopenDetailAfterViewer] = useState(false);

  const feedbackSql = statusFilter
    ? `SELECT * FROM ${TABLES.USER_FEEDBACK} WHERE status = ? ORDER BY created_at DESC LIMIT 100`
    : `SELECT * FROM ${TABLES.USER_FEEDBACK} ORDER BY created_at DESC LIMIT 100`;

  const feedbackQuery = usePowerSyncQuery<DbFeedbackRow>(
    feedbackSql,
    statusFilter ? [statusFilter] : [],
    { enabled: isInitialized, retry: 2 },
  );

  const feedbackUserIds = useMemo(
    () => Array.from(new Set((feedbackQuery.data || []).map(row => row.user_id).filter(Boolean))),
    [feedbackQuery.data],
  );

  const usersSql = feedbackUserIds.length
    ? `SELECT id, first_name, last_name, email FROM ${TABLES.USERS} WHERE id IN (${feedbackUserIds.map(() => '?').join(',')})`
    : `SELECT id, first_name, last_name, email FROM ${TABLES.USERS} WHERE 0`;

  const usersQuery = usePowerSyncQuery<DbUserRow>(
    usersSql,
    feedbackUserIds,
    { enabled: isInitialized, retry: 2 },
  );

  const localFeedback = useMemo<FeedbackItem[]>(() => {
    const usersById = new Map((usersQuery.data || []).map(u => [u.id, u]));
    return (feedbackQuery.data || []).map((row): FeedbackItem => {
      const user = usersById.get(row.user_id);
      const firstName = user?.first_name || '';
      const lastName = user?.last_name || '';
      const userName = `${firstName} ${lastName}`.trim();

      return {
        id: row.id,
        userId: row.user_id,
        userName,
        userEmail: user?.email || '',
        category: row.category,
        title: row.title,
        description: row.description,
        attachments: parseJsonArray<FeedbackItem['attachments'][number]>(row.attachments),
        appSections: parseJsonArray<string>(row.app_sections),
        syncDiagnostics: row.sync_diagnostics ? (() => { try { return JSON.parse(row.sync_diagnostics) as SyncDiagnostics; } catch { return null; } })() : null,
        appVersion: row.app_version,
        platform: row.platform,
        mobilePlatform: row.mobile_platform,
        status: row.status,
        adminNotes: row.admin_notes,
        threadId: row.thread_id,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }, [feedbackQuery.data, usersQuery.data]);

  const fetchFeedbackFromApi = useCallback(async () => {
    try {
      const token = await TokenStorage.getAuthToken();
      if (!token) return;

      let url = getApiUrl('/feedback?limit=100');
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const normalized: FeedbackItem[] = (data.feedback || []).map((item: any) => ({
          ...item,
          attachments: parseJsonArray<FeedbackItem['attachments'][number]>(
            item.attachments,
          ),
          appSections: parseJsonArray<string>(
            item.appSections ?? item.app_sections,
          ),
          syncDiagnostics: item.syncDiagnostics ?? item.sync_diagnostics ?? null,
          appVersion: item.appVersion ?? item.app_version ?? null,
        }));
        setFeedback(normalized);
      }
    } catch (err) {
      console.error('[UserFeedbackView] API fallback fetch error:', err);
    }
  }, [statusFilter]);

  useEffect(() => {
    setHasTriedFallback(false);
  }, [statusFilter]);

  useEffect(() => {
    if (!isInitialized) {
      if (!hasTriedFallback) {
        setIsLoading(true);
        fetchFeedbackFromApi().finally(() => {
          setHasTriedFallback(true);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
      return;
    }

    if (feedbackQuery.isLoading || usersQuery.isLoading) {
      setIsLoading(true);
      return;
    }

    if (localFeedback.length > 0) {
      setFeedback(localFeedback);
      setIsLoading(false);
      return;
    }

    if (!hasTriedFallback) {
      setIsLoading(true);
      fetchFeedbackFromApi().finally(() => {
        setHasTriedFallback(true);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(false);
  }, [
    isInitialized,
    feedbackQuery.isLoading,
    usersQuery.isLoading,
    localFeedback,
    hasTriedFallback,
    fetchFeedbackFromApi,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const resolveAttachmentImages = async () => {
      if (!showDetailModal || !selectedItem?.attachments?.length) {
        setAttachmentPreviews({});
        return;
      }

      const imageAttachments = selectedItem.attachments.filter(
        att => att.filePath && att.contentType?.startsWith('image/'),
      );

      if (imageAttachments.length === 0) {
        setAttachmentPreviews({});
        return;
      }

      const db = PowerSyncService.getInstance().getDatabase() as unknown as DbService | null;
      if (!db) return;

      setAttachmentPreviews({});
      setIsLoadingAttachments(true);

      try {
        const resolved = await Promise.all(
          imageAttachments.map(async att => ({
            filePath: att.filePath,
            uri: await fetchMedia(att.filePath, db),
          })),
        );

        if (isCancelled) return;

        const next: Record<string, string> = {};
        resolved.forEach(item => {
          if (item.uri) next[item.filePath] = item.uri;
        });
        setAttachmentPreviews(next);
      } catch (error) {
        console.error('[UserFeedbackView] Failed to resolve attachment previews:', error);
      } finally {
        if (!isCancelled) {
          setIsLoadingAttachments(false);
        }
      }
    };

    resolveAttachmentImages();

    return () => {
      isCancelled = true;
    };
  }, [selectedItem?.id, showDetailModal]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([feedbackQuery.refetch(), usersQuery.refetch()]);
    if ((feedbackQuery.data || []).length === 0) {
      await fetchFeedbackFromApi();
    }
    setIsRefreshing(false);
  };

  const handleOpenDetail = (item: FeedbackItem) => {
    setSelectedItem(item);
    setAdminNotes(item.adminNotes || '');
    setNewStatus(item.status);
    setAttachmentPreviews({});
    setSelectedImageIndex(null);
    setReopenDetailAfterViewer(false);
    setShowDetailModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    setIsUpdating(true);

    try {
      const token = await TokenStorage.getAuthToken();
      if (!token) return;

      const res = await fetch(getApiUrl(`/feedback/${selectedItem.id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes || null,
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Feedback updated successfully');
        setFeedback(prev =>
          prev.map(item =>
            item.id === selectedItem.id
              ? { ...item, status: newStatus, adminNotes: adminNotes || null }
              : item,
          ),
        );
        setShowDetailModal(false);
        setSelectedImageIndex(null);
        setReopenDetailAfterViewer(false);
        await feedbackQuery.refetch();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to update');
      }
    } catch (err) {
      console.error('[UserFeedbackView] Update error:', err);
      Alert.alert('Error', 'Failed to update feedback');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateThread = async () => {
    if (!selectedItem || isCreatingThread) return;
    setIsCreatingThread(true);

    try {
      const token = await TokenStorage.getAuthToken();
      if (!token) return;

      const res = await fetch(
        getApiUrl(`/feedback/${selectedItem.id}/create-thread`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      if (res.ok) {
        const data = await res.json();
        Alert.alert('Success', 'Chat thread created');
        setSelectedItem({ ...selectedItem, threadId: data.threadId });
        setFeedback(prev =>
          prev.map(item =>
            item.id === selectedItem.id
              ? { ...item, threadId: data.threadId }
              : item,
          ),
        );
        await feedbackQuery.refetch();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to create thread');
      }
    } catch (err) {
      console.error('[UserFeedbackView] Create thread error:', err);
      Alert.alert('Error', 'Failed to create chat thread');
    } finally {
      setIsCreatingThread(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const filteredFeedback = searchTerm.trim()
    ? feedback.filter(
        item =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : feedback;

  const renderItem = ({ item }: { item: FeedbackItem }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.open;
    return (
      <TouchableOpacity
        style={[
          styles.feedbackItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          <Text
            style={[styles.categoryText, { color: colors.textSecondary }]}
          >
            {CATEGORY_LABELS[item.category] || item.category}
          </Text>
          {item.platform && (
            <View style={styles.platformBadge}>
              {(item.platform === 'mobile' || item.platform === 'both') && (
                <Smartphone size={11} color={colors.textSecondary} />
              )}
              {(item.platform === 'web' || item.platform === 'both') && (
                <Monitor size={11} color={colors.textSecondary} />
              )}
              {item.mobilePlatform && (
                <Text
                  style={[
                    styles.categoryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.mobilePlatform === 'ios' ? 'iOS' : 'Android'}
                </Text>
              )}
            </View>
          )}
          {item.attachments?.length > 0 && (
            <Paperclip size={12} color={colors.textSecondary} />
          )}
          {item.threadId && (
            <MessageCircle size={12} color={colors.info} />
          )}
        </View>

        <Text
          style={[styles.itemTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        {item.appSections?.length > 0 && (
          <View style={styles.appSectionsRow}>
            {item.appSections.slice(0, 3).map(s => (
              <View
                key={s}
                style={[
                  styles.appSectionChip,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.appSectionChipText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {APP_SECTION_LABELS[s] || s.split('.').pop()}
                </Text>
              </View>
            ))}
            {item.appSections.length > 3 && (
              <Text
                style={[styles.dateText, { color: colors.textTertiary }]}
              >
                +{item.appSections.length - 3}
              </Text>
            )}
          </View>
        )}

        <Text
          style={[styles.itemDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={styles.itemFooter}>
          <Text style={[styles.userText, { color: colors.textTertiary }]}>
            {item.userName || item.userEmail}
          </Text>
          <View style={styles.footerRight}>
            {item.appVersion && (
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                v{item.appVersion}
              </Text>
            )}
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const statusStyle =
      STATUS_COLORS[selectedItem.status] || STATUS_COLORS.open;
    const imageAttachments = (selectedItem.attachments || []).filter(att =>
      att.contentType?.startsWith('image/'),
    );
    const imageViewerItems: MediaThumbnailItem[] = imageAttachments
      .map(att => ({
        id: att.filePath,
        uri: attachmentPreviews[att.filePath] || '',
        type: 'image' as const,
        caption: att.fileName,
      }))
      .filter(item => !!item.uri);

    const handleCloseDetail = () => {
      setSelectedImageIndex(null);
      setReopenDetailAfterViewer(false);
      setShowDetailModal(false);
    };

    return (
      <>
        <BottomSheet
          visible={showDetailModal}
          onClose={handleCloseDetail}
          title="Review Feedback"
          snapPoint={90}
          showHandle={true}
          showCloseButton={true}
        >
              {/* User info */}
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Submitted by
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {selectedItem.userName || 'Unknown'} ({selectedItem.userEmail})
              </Text>

              {/* Current status + category */}
              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusStyle.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusStyle.text }]}
                  >
                    {selectedItem.status.replace('_', ' ')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {CATEGORY_LABELS[selectedItem.category] ||
                    selectedItem.category}
                </Text>
              </View>

              {/* Platform */}
              {selectedItem.platform && (
                <View style={styles.platformDetailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary, marginTop: 0, marginBottom: 0 },
                    ]}
                  >
                    Platform
                  </Text>
                  <View
                    style={[
                      styles.platformDetailBadge,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    {(selectedItem.platform === 'mobile' || selectedItem.platform === 'both') && (
                      <Smartphone size={13} color={colors.textSecondary} />
                    )}
                    {(selectedItem.platform === 'web' || selectedItem.platform === 'both') && (
                      <Monitor size={13} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.platformDetailText, { color: colors.textSecondary }]}>
                      {selectedItem.platform === 'both'
                        ? 'Mobile & Web'
                        : selectedItem.platform === 'mobile'
                          ? 'Mobile'
                          : 'Web'}
                      {selectedItem.mobilePlatform
                        ? ` (${selectedItem.mobilePlatform === 'ios' ? 'iOS' : 'Android'})`
                        : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* App Version */}
              {selectedItem.appVersion && (
                <View style={styles.platformDetailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary, marginTop: 0, marginBottom: 0 },
                    ]}
                  >
                    App Version
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    v{selectedItem.appVersion}
                  </Text>
                </View>
              )}

              {/* Title */}
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Title
              </Text>
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {selectedItem.title}
              </Text>

              {/* Description */}
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Description
              </Text>
              <Text style={[styles.detailDescription, { color: colors.text }]}>
                {selectedItem.description}
              </Text>

              {/* App Sections */}
              {selectedItem.appSections?.length > 0 && (
                <View style={styles.appSectionsDetail}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    App Sections
                  </Text>
                  <View style={styles.appSectionsRow}>
                    {selectedItem.appSections.map(s => (
                      <View
                        key={s}
                        style={[
                          styles.appSectionChip,
                          { backgroundColor: colors.backgroundSecondary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.appSectionChipText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {APP_SECTION_LABELS[s] || s}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Sync Diagnostics */}
              {selectedItem.syncDiagnostics && (
                <View style={[styles.syncDiagnosticsSection, { borderColor: colors.warning + '40' }]}>
                  <Text style={[styles.detailLabel, { color: colors.warning, marginTop: 0 }]}>
                    Sync Diagnostics
                  </Text>
                  <View style={styles.syncDiagGrid}>
                    <View style={styles.syncDiagRow}>
                      <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>Connected</Text>
                      <Text style={[styles.syncDiagValue, { color: selectedItem.syncDiagnostics.isConnected ? colors.success : colors.error }]}>
                        {selectedItem.syncDiagnostics.isConnected ? 'Yes' : 'No'}
                      </Text>
                    </View>
                    <View style={styles.syncDiagRow}>
                      <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>Timed Out</Text>
                      <Text style={[styles.syncDiagValue, { color: selectedItem.syncDiagnostics.connectionTimedOut ? colors.error : colors.text }]}>
                        {selectedItem.syncDiagnostics.connectionTimedOut ? 'Yes' : 'No'}
                      </Text>
                    </View>
                    <View style={styles.syncDiagRow}>
                      <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>Last Sync</Text>
                      <Text style={[styles.syncDiagValue, { color: colors.text }]}>
                        {selectedItem.syncDiagnostics.lastSyncTime
                          ? new Date(selectedItem.syncDiagnostics.lastSyncTime).toLocaleString()
                          : 'Never'}
                      </Text>
                    </View>
                    <View style={styles.syncDiagRow}>
                      <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>Pending Changes</Text>
                      <Text style={[styles.syncDiagValue, { color: colors.text }]}>
                        {selectedItem.syncDiagnostics.pendingChanges}
                      </Text>
                    </View>
                    <View style={styles.syncDiagRow}>
                      <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>Platform</Text>
                      <Text style={[styles.syncDiagValue, { color: colors.text }]}>
                        {selectedItem.syncDiagnostics.devicePlatform}
                      </Text>
                    </View>
                    <View style={styles.syncDiagRow}>
                      <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>Server</Text>
                      <Text style={[styles.syncDiagValue, { color: colors.text }]} numberOfLines={1}>
                        {selectedItem.syncDiagnostics.serverUrl || 'unknown'}
                      </Text>
                    </View>
                  </View>

                  {/* Table counts */}
                  {Object.keys(selectedItem.syncDiagnostics.tableCounts).length > 0 && (
                    <>
                      <Text style={[styles.syncDiagSubheading, { color: colors.textSecondary }]}>
                        Table Counts
                      </Text>
                      {Object.entries(selectedItem.syncDiagnostics.tableCounts).map(([table, count]) => (
                        <View key={table} style={styles.syncDiagRow}>
                          <Text style={[styles.syncDiagLabel, { color: colors.textSecondary }]}>{table}</Text>
                          <Text style={[styles.syncDiagValue, { color: colors.text }]}>{count}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Errors */}
                  {selectedItem.syncDiagnostics.errors?.length > 0 && (
                    <>
                      <Text style={[styles.syncDiagSubheading, { color: colors.error }]}>
                        Errors
                      </Text>
                      {selectedItem.syncDiagnostics.errors.map((err, i) => (
                        <Text key={i} style={[styles.syncDiagError, { color: colors.error }]} numberOfLines={2}>
                          {err}
                        </Text>
                      ))}
                    </>
                  )}
                </View>
              )}

              {/* Attachments */}
              {selectedItem.attachments?.length > 0 && (
                <View style={styles.attachmentsSection}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Attachments ({selectedItem.attachments.length})
                  </Text>
                  <View style={styles.attachmentGrid}>
                    {selectedItem.attachments.map((att, idx) => {
                      const isImage = att.contentType?.startsWith('image/');
                      const previewUri = attachmentPreviews[att.filePath];

                      return (
                        <View
                          key={`${att.filePath}-${idx}`}
                          style={[
                            styles.attachmentCard,
                            { borderColor: colors.border, backgroundColor: colors.background },
                          ]}
                        >
                          {isImage ? (
                            <View style={styles.attachmentThumbnailWrap}>
                              <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => {
                                  const imageIndex = imageAttachments.findIndex(
                                    image => image.filePath === att.filePath,
                                  );
                                  if (imageIndex >= 0 && previewUri) {
                                    setReopenDetailAfterViewer(true);
                                    setShowDetailModal(false);
                                    setTimeout(() => {
                                      setSelectedImageIndex(imageIndex);
                                    }, 220);
                                  }
                                }}
                                disabled={!previewUri}
                              >
                                <MediaThumbnail
                                  uri={previewUri || ''}
                                  type="image"
                                  style={styles.attachmentThumbnail}
                                />
                              </TouchableOpacity>
                              {!previewUri && isLoadingAttachments && (
                                <View style={styles.attachmentLoadingOverlay}>
                                  <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                              )}
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.attachmentFilePlaceholder,
                                { backgroundColor: colors.backgroundSecondary },
                              ]}
                            >
                              <FileText size={20} color={colors.textSecondary} />
                            </View>
                          )}
                          <Text
                            style={[
                              styles.attachmentName,
                              { color: colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {att.fileName}
                          </Text>
                          <Text
                            style={[
                              styles.attachmentSize,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {(att.fileSize / 1024).toFixed(0)} KB
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Follow-up Chat */}
              <View
                style={[
                  styles.chatThreadSection,
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    { color: colors.textSecondary, marginTop: 0 },
                  ]}
                >
                  Follow-up Chat
                </Text>
                {selectedItem.threadId ? (
                  <View style={styles.chatThreadRow}>
                    <MessageCircle size={16} color={colors.primary} />
                    <Text
                      style={[styles.chatThreadText, { color: colors.text }]}
                    >
                      Chat thread active. Will be archived when resolved.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.chatThreadButton,
                      { borderColor: colors.primary },
                    ]}
                    onPress={handleCreateThread}
                    disabled={isCreatingThread}
                  >
                    {isCreatingThread ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <MessageCircle size={16} color={colors.primary} />
                        <Text
                          style={[
                            styles.chatThreadButtonText,
                            { color: colors.primary },
                          ]}
                        >
                          Start Chat with User
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Date */}
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Submitted
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(selectedItem.createdAt)}
              </Text>

              {/* Status update */}
              <Text
                style={[
                  styles.detailLabel,
                  { color: colors.textSecondary, marginTop: spacing.lg },
                ]}
              >
                Update Status
              </Text>
              <View style={styles.statusPicker}>
                {STATUS_OPTIONS.map(s => {
                  const sc = STATUS_COLORS[s];
                  const isSelected = newStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: isSelected ? sc.bg : 'transparent',
                          borderColor: sc.bg,
                        },
                      ]}
                      onPress={() => setNewStatus(s)}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          {
                            color: isSelected
                              ? sc.text
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {s.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Admin notes */}
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Admin Notes
              </Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Add notes for the user..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Save button */}
              <View
                style={[styles.modalFooter, { borderTopColor: colors.border }]}
              >
                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={[styles.updateButtonText, { color: colors.textInverse }]}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
        </BottomSheet>

        {selectedImageIndex !== null && imageViewerItems.length > 0 && (
          <FullScreenMediaViewer
            visible={true}
            items={imageViewerItems}
            initialIndex={selectedImageIndex}
            onClose={() => {
              setSelectedImageIndex(null);
              if (reopenDetailAfterViewer) {
                setReopenDetailAfterViewer(false);
                setShowDetailModal(true);
              }
            }}
          />
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading feedback...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search + filter */}
      <View style={styles.filterRow}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search feedback..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsRow}
        contentContainerStyle={styles.filterChipsContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            !statusFilter && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
            statusFilter && { borderColor: colors.border },
          ]}
          onPress={() => setStatusFilter(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: !statusFilter ? colors.textInverse : colors.textSecondary },
            ]}
          >
            All ({feedback.length})
          </Text>
        </TouchableOpacity>
        {STATUS_OPTIONS.map(s => {
          const count = feedback.filter(f => f.status === s).length;
          const isActive = statusFilter === s;
          const sc = STATUS_COLORS[s];
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: sc.bg, borderColor: sc.bg },
                !isActive && { borderColor: colors.border },
              ]}
              onPress={() => setStatusFilter(isActive ? null : s)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? sc.text : colors.textSecondary },
                ]}
              >
                {s.replace('_', ' ')} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredFeedback}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.centeredContainer}>
            <MessageSquare size={48} color={colors.textTertiary} />
            <Text
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              No feedback found
            </Text>
          </View>
        }
      />

      {/* Detail modal */}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    padding: 0,
  },
  filterChipsRow: {
    maxHeight: 44,
    marginBottom: spacing.sm,
  },
  filterChipsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  feedbackItem: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  itemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
    marginBottom: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userText: {
    fontSize: typography.fontSize.xs,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
  },
  appSectionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.xs,
  },
  appSectionChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  appSectionChipText: {
    fontSize: typography.fontSize.xs,
  },
  appSectionsDetail: {
    marginTop: spacing.md,
  },
  // Detail content
  detailLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    marginBottom: spacing.xs,
  },
  detailTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  detailDescription: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  platformDetailRow: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  platformDetailBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  platformDetailText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  attachmentsSection: {
    marginTop: spacing.md,
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  attachmentCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    gap: 4,
  },
  attachmentThumbnailWrap: {
    position: 'relative',
  },
  attachmentThumbnail: {
    borderRadius: borderRadius.sm,
  },
  attachmentLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: borderRadius.sm,
  },
  attachmentFilePlaceholder: {
    height: 92,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentName: {
    fontSize: typography.fontSize.sm,
  },
  attachmentSize: {
    fontSize: typography.fontSize.xs,
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statusChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  chatThreadSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  chatThreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chatThreadText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  chatThreadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  chatThreadButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    minHeight: 100,
    marginBottom: spacing.md,
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  updateButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  syncDiagnosticsSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  syncDiagGrid: {
    gap: spacing.xs,
  },
  syncDiagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  syncDiagLabel: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  syncDiagValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'right',
    flexShrink: 1,
  },
  syncDiagSubheading: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  syncDiagError: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
});
