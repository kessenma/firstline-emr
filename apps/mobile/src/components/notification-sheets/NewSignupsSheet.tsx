// apps/mobile/src/components/notification-sheets/NewSignupsSheet.tsx
// Bottom sheet for new signup notifications — shows pending signups with approve/deny

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { UserCard } from '../admin/shared';
import { useNewSignupsViewModel } from '../../viewModels/admin/useNewSignupsViewModel';
import type { NewSignupUser } from '../../viewModels/admin/useNewSignupsViewModel';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface NewSignupsSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenFull: () => void;
}

export function NewSignupsSheet({
  visible,
  onClose,
  onOpenFull,
}: NewSignupsSheetProps) {
  const colors = useThemeColors();
  const {
    users,
    isLoading,
    error,
    approveUsers,
    denyUsers,
  } = useNewSignupsViewModel();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleOpenFull = () => {
    onClose();
    onOpenFull();
  };

  const handleApprove = async (user: NewSignupUser) => {
    setProcessingId(user.id);
    try {
      await approveUsers([user.id]);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (user: NewSignupUser) => {
    setProcessingId(user.id);
    try {
      await denyUsers([user.id]);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="New User Signups"
      snapPoint={90}
      showHandle
      showCloseButton
    >
      {/* Open Full Dashboard button */}
      <TouchableOpacity
        style={[styles.openFullButton, { borderColor: colors.border }]}
        onPress={handleOpenFull}
      >
        <ExternalLink size={16} color={colors.primary} />
        <Text style={[styles.openFullText, { color: colors.primary }]}>
          Open Full Dashboard
        </Text>
      </TouchableOpacity>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading signups...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No pending signups
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {users.length} pending signup{users.length !== 1 ? 's' : ''}
          </Text>
          {users.map(user => (
            <UserCard
              key={user.id}
              user={user}
              actions={[
                <TouchableOpacity
                  key="approve"
                  onPress={() => handleApprove(user)}
                  disabled={processingId === user.id}
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.success + '15' },
                  ]}
                >
                  {processingId === user.id ? (
                    <ActivityIndicator size="small" color={colors.success} />
                  ) : (
                    <Text style={[styles.actionText, { color: colors.success }]}>
                      Approve
                    </Text>
                  )}
                </TouchableOpacity>,
                <TouchableOpacity
                  key="deny"
                  onPress={() => handleDeny(user)}
                  disabled={processingId === user.id}
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.error + '15' },
                  ]}
                >
                  {processingId === user.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={[styles.actionText, { color: colors.error }]}>
                      Deny
                    </Text>
                  )}
                </TouchableOpacity>,
              ]}
            />
          ))}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  openFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  openFullText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  countText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
