// apps/mobile/src/screens/user-profile/components/MissionEnrollmentSheet.tsx
// Bottom sheet for editing mission enrollment: leave current missions (self-serve),
// see pending join requests, and request to join available missions (admin-approved).
// Missions list comes from PowerSync; request state comes over REST since
// mission_requests is not synced offline.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Globe,
  MapPin,
  Check,
  Clock,
  LogOut,
  UserPlus,
} from 'lucide-react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { getApiUrl } from '../../../config';
import { getStoredToken } from '../../../utils/storage';
import { useSyncStatus } from '../../../hooks/powersync';
import type { MissionOption } from '../../../hooks/useMissions';

interface PendingRequest {
  id: string;
  missionId: string;
  status: string;
  missionName: string;
  missionCountry: string;
  createdAt: string;
}

interface MissionEnrollmentSheetProps {
  visible: boolean;
  onClose: () => void;
  myMissions: MissionOption[];
  allMissions: MissionOption[];
}

export const MissionEnrollmentSheet: React.FC<MissionEnrollmentSheetProps> = ({
  visible,
  onClose,
  myMissions,
  allMissions,
}) => {
  const colors = useThemeColors();
  const { isConnected } = useSyncStatus({
    pollInterval: 2500,
    enableDetailedLogging: false,
  });

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  // Optimistic — covers the gap until PowerSync syncs users.missions back
  const [locallyLeftIds, setLocallyLeftIds] = useState<Set<string>>(new Set());

  const fetchPendingRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const token = await getStoredToken();
      const res = await fetch(getApiUrl('/missions/request-join'), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(
          (data.requests || []).filter((r: PendingRequest) => r.status === 'pending'),
        );
      }
    } catch (err) {
      console.warn('[MissionEnrollment] Failed to fetch join requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
      fetchPendingRequests();
    }
  }, [visible, fetchPendingRequests]);

  const currentMissions = useMemo(
    () => myMissions.filter((m) => !locallyLeftIds.has(m.id)),
    [myMissions, locallyLeftIds],
  );

  const availableMissions = useMemo(() => {
    const memberIds = new Set(currentMissions.map((m) => m.id));
    const pendingIds = new Set(pendingRequests.map((r) => r.missionId));
    return allMissions.filter(
      (m) =>
        (m.status === 'planned' || m.status === 'active') &&
        !memberIds.has(m.id) &&
        !pendingIds.has(m.id),
    );
  }, [allMissions, currentMissions, pendingRequests]);

  const toggleSelection = (missionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(missionId)) {
        next.delete(missionId);
      } else {
        next.add(missionId);
      }
      return next;
    });
  };

  const handleLeave = (mission: MissionOption) => {
    Alert.alert(
      'Leave Mission',
      `Leave "${mission.name}"? You will be removed from its group chat.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeavingId(mission.id);
            try {
              const token = await getStoredToken();
              const res = await fetch(
                getApiUrl(`/missions/${mission.id}/leave`),
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to leave mission');
              }
              setLocallyLeftIds((prev) => new Set(prev).add(mission.id));
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to leave mission',
              );
            } finally {
              setLeavingId(null);
            }
          },
        },
      ],
    );
  };

  const handleSubmitRequests = async () => {
    if (selectedIds.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getStoredToken();
      const res = await fetch(getApiUrl('/missions/request-join'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ missionIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit requests');
      }
      setSelectedIds(new Set());
      await fetchPendingRequests();
      Alert.alert(
        'Requests Sent',
        'Your mission join requests were sent for admin approval.',
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to submit requests',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoint={90}
      title="Edit Missions"
    >
      <View style={styles.container}>
        {!isConnected && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.offlineBannerText, { color: colors.warningDark }]}>
              You're offline — joining and leaving missions requires a connection.
            </Text>
          </View>
        )}

        {/* Current Missions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            My Missions
          </Text>
          {currentMissions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              You're not enrolled in any missions yet.
            </Text>
          ) : (
            currentMissions.map((mission) => (
              <View
                key={mission.id}
                style={[styles.missionRow, { borderColor: colors.border }]}
              >
                <Globe size={16} color={colors.primary} />
                <View style={styles.missionInfo}>
                  <Text style={[styles.missionName, { color: colors.text }]} numberOfLines={1}>
                    {mission.name}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={colors.textSecondary} />
                    <Text style={[styles.missionLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                      {mission.country}{mission.city ? `, ${mission.city}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.leaveButton,
                    { backgroundColor: isConnected ? colors.error + '15' : colors.border },
                  ]}
                  onPress={() => handleLeave(mission)}
                  disabled={!isConnected || leavingId === mission.id}
                >
                  {leavingId === mission.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <LogOut size={14} color={isConnected ? colors.error : colors.textSecondary} />
                      <Text
                        style={[
                          styles.leaveButtonText,
                          { color: isConnected ? colors.error : colors.textSecondary },
                        ]}
                      >
                        Leave
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Pending Requests */}
        {(requestsLoading || pendingRequests.length > 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pending Requests
            </Text>
            {requestsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              pendingRequests.map((req) => (
                <View
                  key={req.id}
                  style={[styles.pendingRow, { backgroundColor: colors.warning + '12' }]}
                >
                  <Clock size={14} color={colors.warningDark} />
                  <Text style={[styles.pendingText, { color: colors.warningDark }]} numberOfLines={1}>
                    {req.missionName} ({req.missionCountry}) — Pending approval
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Available Missions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Available Missions
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Select missions and request to join. Requests are reviewed by an admin.
          </Text>
          {availableMissions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No missions are open for enrollment right now.
            </Text>
          ) : (
            availableMissions.map((mission) => {
              const isSelected = selectedIds.has(mission.id);
              return (
                <TouchableOpacity
                  key={mission.id}
                  style={[
                    styles.missionRow,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary + '08' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleSelection(mission.id)}
                  disabled={!isConnected}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Check size={12} color={colors.textInverse} />}
                  </View>
                  <View style={styles.missionInfo}>
                    <Text style={[styles.missionName, { color: colors.text }]} numberOfLines={1}>
                      {mission.name}
                    </Text>
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={colors.textSecondary} />
                      <Text style={[styles.missionLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                        {mission.country}{mission.city ? `, ${mission.city}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          mission.status === 'active'
                            ? colors.success + '20'
                            : colors.info + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            mission.status === 'active' ? colors.success : colors.info,
                        },
                      ]}
                    >
                      {mission.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {selectedIds.size > 0 && (
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    !isConnected || isSubmitting ? colors.textSecondary : colors.primary,
                },
              ]}
              onPress={handleSubmitRequests}
              disabled={!isConnected || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <UserPlus size={16} color={colors.textInverse} />
                  <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                    Request to Join ({selectedIds.size})
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
  offlineBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  offlineBannerText: {
    fontSize: typography.fontSize.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  missionInfo: {
    flex: 1,
  },
  missionName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  missionLocation: {
    fontSize: typography.fontSize.sm,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 76,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  leaveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  pendingText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
