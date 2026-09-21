// apps/mobile/src/components/admin/sections/deniedUsers/DeniedUsersView.tsx
// Main view component for Denied Users section with user management capabilities

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { UserCheck, AlertCircle, Loader2, UserX } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useDeniedUsersViewModel } from '../../../../viewModels/admin/useDeniedUsersViewModel';
import { DeniedUserCard } from './DeniedUserCard';
import { Card, CardContent, Button } from '../../../ui';
import type { DeniedUser } from '../../../../viewModels/admin/useDeniedUsersViewModel';

export default function DeniedUsersView() {
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
    reinstateUsers,
  } = useDeniedUsersViewModel();

  const [isProcessing, setIsProcessing] = useState(false);

  // Handle reinstate selected users
  const handleReinstateSelected = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('No Selection', 'Please select users to reinstate.');
      return;
    }

    Alert.alert(
      'Confirm Reinstatement',
      `Are you sure you want to reinstate ${selectedUserIds.length} user${
        selectedUserIds.length > 1 ? 's' : ''
      }? They will be able to access the system again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reinstate',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await reinstateUsers(selectedUserIds);
              Alert.alert(
                'Success',
                `Successfully reinstated ${selectedUserIds.length} user${
                  selectedUserIds.length > 1 ? 's' : ''
                }.`,
              );
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error
                  ? err.message
                  : 'Failed to reinstate users',
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Handle reinstate single user
  const handleReinstateSingle = async (user: DeniedUser) => {
    Alert.alert(
      'Confirm Reinstatement',
      `Reinstate ${user.firstName} ${user.lastName}? They will be able to access the system again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reinstate',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await reinstateUsers([user.id]);
              Alert.alert(
                'Success',
                `${user.firstName} ${user.lastName} has been reinstated.`,
              );
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to reinstate user',
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      loadMore();
    }
  };

  // Render item
  const renderItem = ({ item }: { item: DeniedUser }) => (
    <DeniedUserCard
      user={item}
      isSelected={selectedUserIds.includes(item.id)}
      onToggleSelect={() => toggleUserSelection(item.id)}
      onReinstate={() => handleReinstateSingle(item)}
      isProcessing={isProcessing}
    />
  );

  // Render header (bulk actions)
  const renderHeader = () => {
    if (users.length === 0) return null;

    return (
      <Card style={styles.header}>
        <CardContent>
          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.warning + '15' }]}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={[styles.infoBannerText, { color: colors.warningDark }]}>
              These users were denied access. You can reinstate them to restore
              their access.
            </Text>
          </View>

          {/* Select All */}
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={toggleSelectAll}
            disabled={isProcessing}
          >
            <View
              style={[
                styles.selectAllCheckbox,
                isAllSelected && styles.selectAllCheckboxSelected,
                { borderColor: colors.border },
              ]}
            >
              {isAllSelected && <UserCheck size={16} color={colors.textInverse} />}
            </View>
            <Text style={[styles.selectAllText, { color: colors.text }]}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          {/* Bulk Actions */}
          {selectedUserIds.length > 0 && (
            <View style={styles.bulkActions}>
              <Button
                onPress={handleReinstateSelected}
                disabled={isProcessing}
                style={[styles.reinstateButton, { backgroundColor: colors.success }]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <UserCheck size={18} color={colors.textInverse} />
                    <Text style={[styles.bulkButtonText, { color: colors.textInverse }]}>
                      Reinstate ({selectedUserIds.length})
                    </Text>
                  </>
                )}
              </Button>
            </View>
          )}

          {/* Selection count */}
          {selectedUserIds.length > 0 && (
            <TouchableOpacity
              style={styles.clearSelectionButton}
              onPress={clearSelection}
            >
              <Text
                style={[styles.clearSelectionText, { color: colors.primary }]}
              >
                Clear Selection
              </Text>
            </TouchableOpacity>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render footer (loading more indicator)
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

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <UserX size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
          No Denied Users
        </Text>
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          There are no denied users at this time.
        </Text>
      </View>
    );
  };

  // Render error state
  const renderErrorState = () => {
    if (!error || isLoading) return null;

    return (
      <View style={styles.errorState}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={[styles.errorStateTitle, { color: colors.text }]}>
          Error Loading Denied Users
        </Text>
        <Text style={[styles.errorStateText, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={refreshUsers}
        >
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render loading state (initial)
  if (isLoading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading denied users...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error && !isLoading && users.length === 0 ? (
        renderErrorState()
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContent,
            users.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshUsers}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.base,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
    gap: spacing.sm,
    // backgroundColor set inline
  },
  infoBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
    // color set inline
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectAllCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: 'transparent',
  },
  selectAllCheckboxSelected: {
    backgroundColor: undefined,
  },
  selectAllText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  reinstateButton: {
    // backgroundColor set inline via colors.success
  },
  bulkButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  clearSelectionButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  clearSelectionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  errorStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  errorStateText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.base,
  },
});
