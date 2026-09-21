// apps/mobile/src/components/patient-chart/CareTeamSheet.tsx
// Care team bottom sheet for viewing/joining/leaving care team in patient chart

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Crown,
  UserPlus,
  LogOut,
  ShieldMinus,
} from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { useCareTeam } from '../../hooks/useCareTeamActions';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors } from '../../contexts/ThemeContext';
import {
  getRolesForAccountType,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  isLeadRole,
} from '@fajr/shared/care-team';
import type { CareTeamRole } from '@fajr/shared/care-team';

interface CareTeamSheetProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
}

export const CareTeamSheet: React.FC<CareTeamSheetProps> = ({
  visible,
  onClose,
  patientId,
}) => {
  const { user } = useAuth();
  const colors = useThemeColors();
  const {
    careTeam,
    loading,
    isCurrentUserOnTeam,
    isCurrentUserLead,
    joinAsRole,
    yieldLead,
    leaveTeam,
  } = useCareTeam(patientId);

  const [actionLoading, setActionLoading] = useState(false);
  const availableRoles = getRolesForAccountType(user?.accountType || '');

  const handleJoinAsRole = async (role: CareTeamRole) => {
    setActionLoading(true);
    try {
      await joinAsRole(role, isLeadRole(role));
    } catch {
      Alert.alert('Error', 'Failed to join care team. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleYieldLead = async () => {
    Alert.alert(
      'Yield Lead',
      'Are you sure you want to yield lead surgeon role?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yield Lead',
          onPress: async () => {
            setActionLoading(true);
            try {
              await yieldLead();
            } catch {
              Alert.alert('Error', 'Failed to yield lead. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleLeaveTeam = async () => {
    Alert.alert(
      'Leave Team',
      'Are you sure you want to leave this care team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveTeam();
            } catch {
              Alert.alert('Error', 'Failed to leave team. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Care Team (${careTeam.length})`}
      snapPoint={60}
    >
      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading care team...</Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && careTeam.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No team members yet. Be the first to join!
        </Text>
      )}

      {/* Team Members */}
      {!loading && careTeam.length > 0 && (
        <View style={styles.membersList}>
          {careTeam.map((member) => {
            const badgeColor = ROLE_BADGE_COLORS[member.role as CareTeamRole] || ROLE_BADGE_COLORS.coordinator;
            const currentUserId = String(user?.id || '');
            const isCurrentUser = member.userId === currentUserId;

            return (
              <View key={member.id} style={[styles.memberRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={styles.memberInfo}>
                  {member.isLead && (
                    <Crown size={16} color={colors.warning} />
                  )}
                  <View>
                    <Text style={[styles.memberName, { color: colors.text }, member.isLead && styles.memberNameLead]}>
                      {member.userName || member.userEmail || 'Unknown'}
                      {isCurrentUser ? ' (you)' : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: badgeColor.bg }]}>
                  <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>
                    {member.role}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Actions */}
      {!loading && (
        <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
          {/* Join Team */}
          {!isCurrentUserOnTeam && availableRoles.length > 0 && (
            <View>
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Join as:</Text>
              <View style={styles.roleButtons}>
                {availableRoles.map((role) => {
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleButton, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
                      onPress={() => handleJoinAsRole(role)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <UserPlus size={16} color={colors.primary} />
                          <Text style={[styles.roleButtonText, { color: colors.primary }]}>
                            {ROLE_LABELS[role]}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* On-team actions */}
          {isCurrentUserOnTeam && (
            <View style={styles.onTeamActions}>
              {isCurrentUserLead && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
                  onPress={handleYieldLead}
                  disabled={actionLoading}
                >
                  <ShieldMinus size={16} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Yield Lead</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.error + '30', backgroundColor: colors.surface }]}
                onPress={handleLeaveTeam}
                disabled={actionLoading}
              >
                <LogOut size={16} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>
                  Leave Team
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 24,
  },
  membersList: {
    gap: 8,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
  },
  memberNameLead: {
    fontWeight: '600',
  },
  roleBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  onTeamActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
