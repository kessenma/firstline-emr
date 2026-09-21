// apps/mobile/src/components/admin/sections/adminManagement/AdminManagementView.tsx
// Main view component for Admin Management section

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
import {
  Shield,
  AlertCircle,
  Loader2,
  Users,
  X,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useAdminManagementViewModel } from '../../../../viewModels/admin/useAdminManagementViewModel';
import { AdminCard } from './AdminCard';
import { UserSearchCard } from './UserSearchCard';
import { Card, CardContent, Button, Input } from '../../../ui';
import type { AdminUser } from '../../../../types/admin';

export default function AdminManagementView() {
  const colors = useThemeColors();
  const {
    admins,
    isLoadingAdmins,
    adminsError,
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    hasSearched,
    isRefreshing,
    refreshAdmins,
    setSearchQuery,
    searchUsers,
    clearSearch,
    addAdmin,
    removeAdmin,
    adminCount,
    isAdminEmail,
  } = useAdminManagementViewModel();

  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Handle search submit
  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery.trim());
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    clearSearch();
  };

  // Handle add admin
  const handleAddAdmin = async (
    userId: string,
    userName: string,
    userEmail: string,
  ) => {
    // Check if already admin
    if (isAdminEmail(userEmail)) {
      Alert.alert('Already Admin', `${userName} is already an admin.`);
      return;
    }

    Alert.alert(
      'Confirm Add Admin',
      `Are you sure you want to make ${userName} an admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Admin',
          style: 'default',
          onPress: async () => {
            setAddingUserId(userId);
            try {
              await addAdmin(userId);
              Alert.alert('Success', `${userName} has been added as an admin.`);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to add admin',
              );
            } finally {
              setAddingUserId(null);
            }
          },
        },
      ],
    );
  };

  // Handle remove admin
  const handleRemoveAdmin = async (admin: AdminUser) => {
    Alert.alert(
      'Confirm Remove Admin',
      `Are you sure you want to remove ${admin.firstName} ${admin.lastName} from admin role?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingAdminId(admin.id);
            try {
              await removeAdmin(admin.id);
              Alert.alert(
                'Success',
                `${admin.firstName} ${admin.lastName} has been removed from admin role.`,
              );
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to remove admin',
              );
            } finally {
              setRemovingAdminId(null);
            }
          },
        },
      ],
    );
  };

  // Render admin item
  const renderAdminItem = ({ item }: { item: AdminUser }) => (
    <AdminCard
      admin={item}
      onRemove={() => handleRemoveAdmin(item)}
      isRemoving={removingAdminId === item.id}
    />
  );

  // Render header with admin count
  const renderHeader = () => (
    <Card style={styles.header}>
      <CardContent style={styles.headerContent}>
        <View
          style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}
        >
          <Shield size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Current Admins
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {adminCount} {adminCount === 1 ? 'admin' : 'admins'}
          </Text>
        </View>
      </CardContent>
    </Card>
  );

  // Render search section
  const renderSearchSection = () => (
    <Card style={styles.searchSection}>
      <CardContent>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Add New Admin
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Search for users by email to grant admin access
        </Text>

        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <View style={styles.searchInputWrapper}>
            <Input
              placeholder="Enter user email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearButton}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <Button
            onPress={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            style={styles.searchButton}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.searchButtonText, { color: colors.textInverse }]}>Search</Text>
            )}
          </Button>
        </View>

        {/* Search Error */}
        {searchError && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{searchError}</Text>
          </View>
        )}

        {/* Search Results */}
        {hasSearched && !isSearching && searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={[styles.resultsTitle, { color: colors.text }]}>
              Search Results ({searchResults.length})
            </Text>
            {searchResults.map(user => (
              <UserSearchCard
                key={user.id}
                user={user}
                onAddAdmin={() =>
                  handleAddAdmin(
                    user.id,
                    `${user.firstName} ${user.lastName}`,
                    user.email,
                  )
                }
                isAdding={addingUserId === user.id}
                isAlreadyAdmin={isAdminEmail(user.email)}
              />
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoadingAdmins) return null;

    return (
      <View style={styles.emptyState}>
        <Users size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
          No Admins Found
        </Text>
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          There are no admins configured at this time.
        </Text>
      </View>
    );
  };

  // Render error state
  const renderErrorState = () => {
    if (!adminsError || isLoadingAdmins) return null;

    return (
      <View style={styles.errorState}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={[styles.errorStateTitle, { color: colors.text }]}>
          Error Loading Admins
        </Text>
        <Text style={[styles.errorStateText, { color: colors.textSecondary }]}>
          {adminsError}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={refreshAdmins}
        >
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render loading state (initial)
  if (isLoadingAdmins && admins.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading admins...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {adminsError && !isLoadingAdmins && admins.length === 0 ? (
        renderErrorState()
      ) : (
        <FlatList
          data={admins}
          renderItem={renderAdminItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <>
              {renderHeader()}
              {renderSearchSection()}
            </>
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            admins.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshAdmins}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
  },
  searchSection: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.base,
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInputField: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  searchButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
    // color set inline via colors.error
  },
  searchResults: {
    marginTop: spacing.md,
  },
  resultsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
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
