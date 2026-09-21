// apps/mobile/src/components/admin/sections/existingUsers/ExistingUsersView.tsx
// View for managing existing users

import { FlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../../../utils/theme';
import {
  useExistingUsersViewModel,
  AccountTypeFilter,
} from '../../../../viewModels/admin/useExistingUsersViewModel';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UserCard,
  ConfirmDialog,
} from '../../shared';
import type { ExistingUserSummary } from '../../../../types/admin';
import { UserDetailsModal } from './UserDetailsModal';
import { Card, CardContent, Input } from '../../../ui';

export const ExistingUsersView: React.FC = () => {
  const colors = useThemeColors();
  const {
    filteredUsers,
    isLoading,
    isRefreshing,
    error,
    accountTypeFilter,
    searchQuery,
    setAccountTypeFilter,
    setSearchQuery,
    refreshUsers,
    moveUserToDenied,
    updateUser,
    doctorCount,
    triageCount,
  } = useExistingUsersViewModel();

  const [selectedUser, setSelectedUser] = useState<ExistingUserSummary | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [userToDeny, setUserToDeny] = useState<ExistingUserSummary | null>(
    null,
  );
  const [isDenying, setIsDenying] = useState(false);

  const handleViewDetails = (user: ExistingUserSummary) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleDenyUser = (user: ExistingUserSummary) => {
    setUserToDeny(user);
    setShowDenyDialog(true);
  };

  const confirmDenyUser = async () => {
    if (!userToDeny) return;

    try {
      setIsDenying(true);
      await moveUserToDenied(userToDeny.id);
      setShowDenyDialog(false);
      setUserToDeny(null);
      Alert.alert('Success', 'User moved to denied status');
    } catch {
      Alert.alert('Error', 'Failed to deny user. Please try again.');
    } finally {
      setIsDenying(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    data: Partial<ExistingUserSummary>,
  ) => {
    try {
      await updateUser(userId, data);
      setShowDetailsModal(false);
      setSelectedUser(null);
      Alert.alert('Success', 'User updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update user. Please try again.');
    }
  };

  const renderFilterTab = (
    filter: AccountTypeFilter,
    label: string,
    count: number,
  ) => {
    const isActive = accountTypeFilter === filter;

    return (
      <TouchableOpacity
        key={filter}
        onPress={() => setAccountTypeFilter(filter)}
        style={[
          styles.filterTab,
          {
            backgroundColor: isActive ? colors.primary : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: isActive ? colors.textInverse : colors.text },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.filterBadge,
            {
              backgroundColor: isActive ? colors.surface : `${colors.primary}20`,
            },
          ]}
        >
          <Text style={[styles.filterBadgeText, { color: colors.primary }]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: ExistingUserSummary) => item.id;

  const renderUserItem = ({ item }: { item: ExistingUserSummary }) => (
    <UserCard
      user={item}
      onPress={() => handleViewDetails(item)}
      actions={[
        <TouchableOpacity
          key="deny"
          onPress={() => handleDenyUser(item)}
          style={[styles.denyButton, { backgroundColor: colors.error + '15' }]}
        >
          <Text style={[styles.denyButtonText, { color: colors.error }]}>
            Move to Denied
          </Text>
        </TouchableOpacity>,
      ]}
    />
  );

  if (isLoading) {
    return <LoadingState message="Loading existing users..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load existing users"
        error={error}
        onRetry={refreshUsers}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <Card style={styles.searchContainer}>
        <CardContent>
          <View style={styles.searchInputWrapper}>
            <Input
              placeholder="Search by name, email, or specialty..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterTab('All', 'All', doctorCount + triageCount)}
        {renderFilterTab('Doctor', 'Doctors', doctorCount)}
        {renderFilterTab('Triage', 'Triage', triageCount)}
      </View>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No Users Found"
          message={
            searchQuery
              ? 'No users match your search criteria'
              : `No ${
                  accountTypeFilter === 'All' ? '' : accountTypeFilter
                } users found`
          }
        />
      ) : (
        <FlashList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
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
              title="No Users Found"
              message={
                searchQuery
                  ? 'No users match your search criteria'
                  : `No ${
                      accountTypeFilter === 'All' ? '' : accountTypeFilter
                    } users found`
              }
            />
          }
        />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          visible={showDetailsModal}
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
          onSave={handleUpdateUser}
        />
      )}

      {/* Deny Confirmation Dialog */}
      <ConfirmDialog
        visible={showDenyDialog}
        title="Move to Denied"
        message={`Are you sure you want to move ${userToDeny?.firstName} ${userToDeny?.lastName} to denied status? They will need to re-register.`}
        variant="danger"
        confirmLabel="Move to Denied"
        loading={isDenying}
        onConfirm={confirmDenyUser}
        onCancel={() => {
          setShowDenyDialog(false);
          setUserToDeny(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  filterTabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  filterBadge: {
    minWidth: 24,
    height: 20,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  denyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
