// apps/mobile/src/components/admin/sections/newSignups/NewSignupsView.tsx
// Main view component for New Signups section - uses shared UserCard and theme

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../../../utils/theme';
import { useNewSignupsViewModel } from '../../../../viewModels/admin/useNewSignupsViewModel';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UserCard,
  BulkActionBar,
  ConfirmDialog,
} from '../../shared';
import type { NewSignupUser } from '../../../../viewModels/admin/useNewSignupsViewModel';
import { FlashList } from '@shopify/flash-list';

export default function NewSignupsView() {
  const colors = useThemeColors();
  const {
    users,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    selectedUserIds,
    isAllSelected,
    error,
    refreshUsers,
    loadMore,
    toggleUserSelection,
    toggleSelectAll,
    clearSelection,
    approveUsers,
    denyUsers,
  } = useNewSignupsViewModel();

  const [isProcessing, setIsProcessing] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger';
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'success',
    confirmLabel: '',
    onConfirm: async () => {},
  });

  const closeDialog = () =>
    setConfirmDialog(prev => ({ ...prev, visible: false }));

  // Single user approve
  const handleApproveSingle = (user: NewSignupUser) => {
    setConfirmDialog({
      visible: true,
      title: 'Confirm Approval',
      message: `Approve ${user.firstName} ${user.lastName}?`,
      variant: 'success',
      confirmLabel: 'Approve',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await approveUsers([user.id]);
        } finally {
          setIsProcessing(false);
          closeDialog();
        }
      },
    });
  };

  // Single user deny
  const handleDenySingle = (user: NewSignupUser) => {
    setConfirmDialog({
      visible: true,
      title: 'Confirm Denial',
      message: `Deny ${user.firstName} ${user.lastName}? They will need to re-register.`,
      variant: 'danger',
      confirmLabel: 'Deny',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await denyUsers([user.id]);
        } finally {
          setIsProcessing(false);
          closeDialog();
        }
      },
    });
  };

  // Bulk approve
  const handleApproveSelected = () => {
    if (selectedUserIds.length === 0) return;
    setConfirmDialog({
      visible: true,
      title: 'Confirm Approval',
      message: `Are you sure you want to approve ${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''}?`,
      variant: 'success',
      confirmLabel: `Approve (${selectedUserIds.length})`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await approveUsers(selectedUserIds);
        } finally {
          setIsProcessing(false);
          closeDialog();
        }
      },
    });
  };

  // Bulk deny
  const handleDenySelected = () => {
    if (selectedUserIds.length === 0) return;
    setConfirmDialog({
      visible: true,
      title: 'Confirm Denial',
      message: `Are you sure you want to deny ${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''}?`,
      variant: 'danger',
      confirmLabel: `Deny (${selectedUserIds.length})`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await denyUsers(selectedUserIds);
        } finally {
          setIsProcessing(false);
          closeDialog();
        }
      },
    });
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      loadMore();
    }
  };

  // Render item using shared UserCard
  const renderItem = ({ item }: { item: NewSignupUser }) => (
    <UserCard
      user={item}
      showCheckbox
      selected={selectedUserIds.includes(item.id)}
      onSelect={() => toggleUserSelection(item.id)}
      actions={[
        <TouchableOpacity
          key="approve"
          onPress={() => handleApproveSingle(item)}
          disabled={isProcessing}
          style={[
            styles.actionButton,
            { backgroundColor: colors.success + '15' },
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.success }]}>
            Approve
          </Text>
        </TouchableOpacity>,
        <TouchableOpacity
          key="deny"
          onPress={() => handleDenySingle(item)}
          disabled={isProcessing}
          style={[
            styles.actionButton,
            { backgroundColor: colors.error + '15' },
          ]}
        >
          <Text style={[styles.actionButtonText, { color: colors.error }]}>
            Deny
          </Text>
        </TouchableOpacity>,
      ]}
    />
  );

  // Select all header
  const renderHeader = () => {
    if (users.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.selectAllRow}
        onPress={toggleSelectAll}
        disabled={isProcessing}
      >
        <View
          style={[
            styles.selectAllCheckbox,
            {
              backgroundColor: isAllSelected ? colors.primary : 'transparent',
              borderColor: isAllSelected ? colors.primary : colors.border,
            },
          ]}
        />
        <Text style={[styles.selectAllText, { color: colors.text }]}>
          {isAllSelected ? 'Deselect All' : 'Select All'} ({users.length})
        </Text>
      </TouchableOpacity>
    );
  };

  // Footer loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text
          style={[styles.footerLoaderText, { color: colors.textSecondary }]}
        >
          Loading more...
        </Text>
      </View>
    );
  };

  // Loading state
  if (isLoading && users.length === 0) {
    return <LoadingState message="Loading new signups..." />;
  }

  // Error state
  if (error && !isLoading && users.length === 0) {
    return (
      <ErrorState
        message="Failed to load new signups"
        error={error}
        onRetry={refreshUsers}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Select All */}
      {renderHeader()}

      {/* User list */}
      <FlashList
        data={users}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshUsers}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No New Signups"
            message="There are no pending user signups at this time."
          />
        }
        ListFooterComponent={renderFooter}
      />

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedUserIds.length}
        totalCount={users.length}
        onClear={clearSelection}
        actions={[
          {
            label: 'Approve',
            onPress: handleApproveSelected,
            variant: 'primary',
            disabled: isProcessing,
          },
          {
            label: 'Deny',
            onPress: handleDenySelected,
            variant: 'danger',
            disabled: isProcessing,
          },
        ]}
      />

      {/* Confirmation dialog */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        loading={isProcessing}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  selectAllCheckbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  selectAllText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerLoaderText: {
    fontSize: typography.fontSize.sm,
  },
});
