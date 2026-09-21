// apps/mobile/src/screens/user-profile/components/MissionInfoSheet.tsx
// Bottom sheet showing mission details, links, attachments, and team members

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {
  MapPin,
  Hospital,
  Calendar,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Globe,
  EyeOff,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomSheet } from '../../../components/BottomSheet';
import { CopyButton } from '../../../components/ui/CopyButton';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useMissionAttachments } from '../../../hooks/useMissionAttachments';
import { useMissionMedia } from '../../../hooks/useMissionMedia';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiUrl } from '../../../config';
import { getStoredToken } from '../../../utils/storage';
import type { MissionOption, MissionHospital } from '../../../hooks/useMissions';
import { useSyncStatus } from '../../../hooks/powersync';

interface MissionMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  doctorSpecialty: string[];
}

interface MissionInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  mission: MissionOption | null;
}

export const MissionInfoSheet: React.FC<MissionInfoSheetProps> = ({
  visible,
  onClose,
  mission,
}) => {
  const navigation = useNavigation();
  const navigationAny = navigation as any;
  const colors = useThemeColors();
  const { user } = useAuth();
  const { isConnected } = useSyncStatus({
    pollInterval: 2500,
    enableDetailedLogging: false,
  });
  const { attachments, loading: attachmentsLoading } = useMissionAttachments(
    mission?.id || null,
  );
  const { viewAttachment, loadingFile } = useMissionMedia();
  const [members, setMembers] = useState<MissionMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [creatingDmFor, setCreatingDmFor] = useState<string | null>(null);
  const [expandedHospital, setExpandedHospital] = useState<number | null>(null);
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!mission?.id) return;
    setMembersLoading(true);
    try {
      const token = await getStoredToken();
      const res = await fetch(
        getApiUrl(`/missions/${mission.id}/members`),
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.warn('[MissionInfo] Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [mission?.id]);

  useEffect(() => {
    if (visible && mission?.id) {
      fetchMembers();
    }
  }, [visible, mission?.id, fetchMembers]);

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open link'),
    );
  };

  const handleViewAttachment = async (filePath: string, contentType: string) => {
    const dataUri = await viewAttachment(filePath);
    if (!dataUri) {
      Alert.alert('Error', 'Could not load attachment. Check your connection.');
      return;
    }
    // For images, we could show in a modal; for now open the signed URL in browser
    if (contentType === 'application/pdf' || contentType.startsWith('image/')) {
      // Get a fresh signed URL to open in browser
      try {
        const token = await getStoredToken();
        const res = await fetch(
          getApiUrl(`/missions/get-media?filePath=${encodeURIComponent(filePath)}`),
          { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.signedUrl) Linking.openURL(data.signedUrl);
        }
      } catch {
        // Fallback — data is cached at least
      }
    }
  };

  const handleStartDm = async (memberId: string) => {
    if (creatingDmFor) return;
    if (!isConnected) {
      Alert.alert('Offline', 'Connect to the internet to start a direct message.');
      return;
    }

    setCreatingDmFor(memberId);
    try {
      const token = await getStoredToken();
      const res = await fetch(getApiUrl('/internal-messages/direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId: memberId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create direct message thread');
      }

      const data = await res.json();
      const threadId = data?.thread?.id;
      if (!threadId) {
        throw new Error('Thread created but missing thread ID');
      }

      onClose();
      navigationAny.navigate('Messages', { openThreadId: threadId });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Could not start direct message. Please try again.';
      Alert.alert('Unable to start chat', message);
    } finally {
      setCreatingDmFor(null);
    }
  };

  const handleDownloadImage = async (filePath: string) => {
    setDownloadingImage(filePath);
    try {
      const token = await getStoredToken();
      const res = await fetch(
        getApiUrl(`/missions/get-media?filePath=${encodeURIComponent(filePath)}`),
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.signedUrl) {
          Linking.openURL(data.signedUrl);
        }
      } else {
        Alert.alert('Error', 'Could not get download link.');
      }
    } catch {
      Alert.alert('Error', 'Could not download image. Check your connection.');
    } finally {
      setDownloadingImage(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const statusColors: Record<string, { bg: string; text: string }> = {
    planned: { bg: colors.info + '20', text: colors.info },
    active: { bg: colors.success + '20', text: colors.success },
    completed: { bg: colors.border + '40', text: colors.textSecondary },
  };

  if (!mission) return null;

  const sc = statusColors[mission.status] || statusColors.planned;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoint={90}
      title={mission.name}
    >
      <View style={styles.container}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>
            {mission.status}
          </Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {mission.country}{mission.city ? `, ${mission.city}` : ''}
            </Text>
          </View>
          {mission.hospitals.length > 0 && (
            <View style={styles.hospitalsSection}>
              {mission.hospitals.map((hospital: MissionHospital, hIdx: number) => {
                const h = typeof hospital === 'string' ? { name: hospital } as MissionHospital : hospital;
                const isExpanded = expandedHospital === hIdx;
                const hasDetails = !!(h.description || h.url || h.website || h.mapLink || (h.images && h.images.length > 0));

                return (
                  <View key={hIdx} style={[styles.hospitalCard, { borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.hospitalHeader}
                      onPress={() => setExpandedHospital(isExpanded ? null : hIdx)}
                      disabled={!hasDetails}
                    >
                      <View style={styles.hospitalHeaderLeft}>
                        <Hospital size={16} color={colors.textSecondary} />
                        <Text style={[styles.hospitalName, { color: colors.text }]}>{h.name}</Text>
                        {h.visibility === 'private' && (
                          <View style={[styles.privateBadge, { backgroundColor: colors.warning + '10' }]}>
                            <EyeOff size={10} color={colors.warningDark} />
                            <Text style={[styles.privateBadgeText, { color: colors.warningDark }]}>Private</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.hospitalHeaderRight}>
                        <CopyButton textToCopy={h.name} label="Hospital name" iconSize={14} />
                        {hasDetails && (isExpanded
                          ? <ChevronUp size={16} color={colors.textSecondary} />
                          : <ChevronDown size={16} color={colors.textSecondary} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.hospitalDetails, { borderTopColor: colors.border }]}>
                        {h.description && (
                          <View style={styles.hospitalDetailRow}>
                            <Text style={[styles.hospitalDescription, { color: colors.textSecondary }]}>
                              {h.description}
                            </Text>
                            <CopyButton textToCopy={h.description} label="Description" iconSize={14} />
                          </View>
                        )}
                        {h.url && (
                          <View style={styles.hospitalLinkRow}>
                            <TouchableOpacity
                              style={styles.hospitalLink}
                              onPress={() => handleOpenUrl(h.url!)}
                            >
                              <ExternalLink size={14} color={colors.primary} />
                              <Text style={[styles.hospitalLinkText, { color: colors.primary }]} numberOfLines={1}>
                                URL
                              </Text>
                            </TouchableOpacity>
                            <CopyButton textToCopy={h.url} label="URL" iconSize={14} />
                          </View>
                        )}
                        {h.website && (
                          <View style={styles.hospitalLinkRow}>
                            <TouchableOpacity
                              style={styles.hospitalLink}
                              onPress={() => handleOpenUrl(h.website!)}
                            >
                              <Globe size={14} color={colors.primary} />
                              <Text style={[styles.hospitalLinkText, { color: colors.primary }]} numberOfLines={1}>
                                Website
                              </Text>
                            </TouchableOpacity>
                            <CopyButton textToCopy={h.website} label="Website" iconSize={14} />
                          </View>
                        )}
                        {h.mapLink && (
                          <View style={styles.hospitalLinkRow}>
                            <TouchableOpacity
                              style={styles.hospitalLink}
                              onPress={() => handleOpenUrl(h.mapLink!)}
                            >
                              <MapPin size={14} color={colors.primary} />
                              <Text style={[styles.hospitalLinkText, { color: colors.primary }]} numberOfLines={1}>
                                Map
                              </Text>
                            </TouchableOpacity>
                            <CopyButton textToCopy={h.mapLink} label="Map link" iconSize={14} />
                          </View>
                        )}
                        {h.images && h.images.length > 0 && (
                          <View style={styles.hospitalImagesRow}>
                            {h.images.map((img, imgIdx) => (
                              <View key={imgIdx} style={[styles.hospitalImageThumb, { borderColor: colors.border }]}>
                                <TouchableOpacity
                                  style={styles.hospitalImageInner}
                                  onPress={() => handleViewAttachment(img.filePath, img.contentType)}
                                  disabled={loadingFile === img.filePath}
                                >
                                  {loadingFile === img.filePath ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                  ) : (
                                    <ImageIcon size={20} color={colors.textSecondary} />
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.downloadButton, { backgroundColor: colors.surface }]}
                                  onPress={() => handleDownloadImage(img.filePath)}
                                  disabled={downloadingImage === img.filePath}
                                >
                                  {downloadingImage === img.filePath ? (
                                    <ActivityIndicator size={10} color={colors.primary} />
                                  ) : (
                                    <Download size={10} color={colors.primary} />
                                  )}
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          {(mission.startDate || mission.endDate) && (
            <View style={styles.detailRow}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {mission.startDate ? formatDate(mission.startDate) : 'TBD'}
                {' - '}
                {mission.endDate ? formatDate(mission.endDate) : 'TBD'}
              </Text>
            </View>
          )}
          {mission.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {mission.description}
            </Text>
          )}
        </View>

        {/* Links Section */}
        {mission.urls.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Links</Text>
            {mission.urls.map((u, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.linkRow, { borderBottomColor: colors.border }]}
                onPress={() => handleOpenUrl(u.url)}
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text
                  style={[styles.linkText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {u.displayName || u.url}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Attachments Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Attachments</Text>
          {attachmentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : attachments.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No attachments.
            </Text>
          ) : (
            attachments.map((att) => (
              <TouchableOpacity
                key={att.id}
                style={[styles.attachmentRow, { borderBottomColor: colors.border }]}
                onPress={() => handleViewAttachment(att.filePath, att.contentType)}
                disabled={loadingFile === att.filePath}
              >
                {att.contentType.startsWith('image/') ? (
                  <ImageIcon size={16} color={colors.textSecondary} />
                ) : (
                  <FileText size={16} color={colors.textSecondary} />
                )}
                <View style={styles.attachmentInfo}>
                  <Text
                    style={[styles.attachmentName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {att.displayName}
                  </Text>
                  {att.fileSize && (
                    <Text style={[styles.attachmentSize, { color: colors.textSecondary }]}>
                      {Math.round(att.fileSize / 1024)}KB
                    </Text>
                  )}
                </View>
                {loadingFile === att.filePath ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <ExternalLink size={14} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Team Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Members</Text>
            {!membersLoading && (
              <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                ({members.length})
              </Text>
            )}
          </View>
          {membersLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : members.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Connect to internet to see team members.
            </Text>
          ) : (
            members.map((member) => (
              <View
                key={member.id}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.memberAvatarText, { color: colors.textInverse }]}>
                    {member.firstName?.[0] || ''}
                    {member.lastName?.[0] || ''}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.firstName} {member.lastName}
                    {member.id === user?.id ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                    {member.accountType}
                    {member.doctorSpecialty?.length > 0
                      ? ` · ${member.doctorSpecialty.join(', ')}`
                      : ''}
                  </Text>
                </View>
                {member.id !== user?.id && (
                  <TouchableOpacity
                    style={[
                      styles.dmButton,
                      { backgroundColor: isConnected ? colors.primary + '15' : colors.border },
                    ]}
                    onPress={() => handleStartDm(member.id)}
                    disabled={!isConnected || creatingDmFor === member.id}
                  >
                    {creatingDmFor === member.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <MessageSquare size={14} color={isConnected ? colors.primary : colors.textSecondary} />
                        <Text
                          style={[
                            styles.dmButtonText,
                            { color: isConnected ? colors.primary : colors.textSecondary },
                          ]}
                        >
                          Message
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          {!isConnected && (
            <Text style={[styles.offlineHint, { color: colors.textSecondary }]}>
              Connect to internet to start direct messages.
            </Text>
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  memberCount: {
    fontSize: typography.fontSize.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: typography.fontSize.base,
    flex: 1,
  },
  description: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  linkText: {
    fontSize: typography.fontSize.base,
    flex: 1,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  attachmentSize: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  memberRole: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  dmButton: {
    minWidth: 92,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dmButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  offlineHint: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  // Hospital card styles
  hospitalsSection: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hospitalCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  hospitalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  hospitalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hospitalName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 1,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  privateBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.medium,
  },
  hospitalDetails: {
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  hospitalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  hospitalDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    flex: 1,
  },
  hospitalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hospitalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  hospitalLinkText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  hospitalImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  hospitalImageThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  hospitalImageInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
