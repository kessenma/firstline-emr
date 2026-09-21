# Section Implementation Template

This template provides a complete example of implementing an admin dashboard section using the View + ViewModel pattern.

## Example: New Signups Section

This serves as a reference implementation that can be adapted for other sections.

---

## Step 1: Create the ViewModel

**File**: `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`

```typescript
// apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/utils/admin/adminApi';
import type { User } from '@/types/admin';

interface NewSignupsState {
  users: User[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

export function useNewSignupsViewModel() {
  // Authentication
  const { token, isAdmin } = useAuth();

  // State
  const [state, setState] = useState<NewSignupsState>({
    users: [],
    loading: false,
    error: null,
    page: 1,
    hasMore: true,
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch new signups
  const fetchNewSignups = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!token || !isAdmin) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await adminApi.getNewSignups(page);
      
      setState(prev => ({
        ...prev,
        users: append ? [...prev.users, ...response.users] : response.users,
        loading: false,
        page: page,
        hasMore: response.hasMore,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch signups',
      }));
    }
  }, [token, isAdmin]);

  // Initial load
  useEffect(() => {
    fetchNewSignups(1, false);
  }, [fetchNewSignups]);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchNewSignups(state.page + 1, true);
    }
  }, [state.hasMore, state.loading, state.page, fetchNewSignups]);

  // Refresh
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setSelectedUsers([]);
    await fetchNewSignups(1, false);
    setIsRefreshing(false);
  }, [fetchNewSignups]);

  // Approve single user
  const approveUser = useCallback(async (userId: string) => {
    try {
      await adminApi.approveUsers([userId]);
      
      // Remove from list
      setState(prev => ({
        ...prev,
        users: prev.users.filter(u => u._id !== userId),
      }));
      
      // Remove from selection if present
      setSelectedUsers(prev => prev.filter(id => id !== userId));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to approve user' 
      };
    }
  }, []);

  // Deny single user
  const denyUser = useCallback(async (userId: string) => {
    try {
      await adminApi.denyUsers([userId]);
      
      // Remove from list
      setState(prev => ({
        ...prev,
        users: prev.users.filter(u => u._id !== userId),
      }));
      
      // Remove from selection if present
      setSelectedUsers(prev => prev.filter(id => id !== userId));
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to deny user' 
      };
    }
  }, []);

  // Bulk approve
  const bulkApprove = useCallback(async () => {
    if (selectedUsers.length === 0) {
      return { success: false, error: 'No users selected' };
    }

    try {
      await adminApi.approveUsers(selectedUsers);
      
      // Remove approved users from list
      setState(prev => ({
        ...prev,
        users: prev.users.filter(u => !selectedUsers.includes(u._id)),
      }));
      
      setSelectedUsers([]);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to approve users' 
      };
    }
  }, [selectedUsers]);

  // Bulk deny
  const bulkDeny = useCallback(async () => {
    if (selectedUsers.length === 0) {
      return { success: false, error: 'No users selected' };
    }

    try {
      await adminApi.denyUsers(selectedUsers);
      
      // Remove denied users from list
      setState(prev => ({
        ...prev,
        users: prev.users.filter(u => !selectedUsers.includes(u._id)),
      }));
      
      setSelectedUsers([]);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to deny users' 
      };
    }
  }, [selectedUsers]);

  // Toggle user selection
  const toggleSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    if (selectedUsers.length === state.users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(state.users.map(u => u._id));
    }
  }, [selectedUsers.length, state.users]);

  // Check if user is selected
  const isSelected = useCallback((userId: string) => {
    return selectedUsers.includes(userId);
  }, [selectedUsers]);

  // Computed values
  const allSelected = useMemo(() => {
    return state.users.length > 0 && selectedUsers.length === state.users.length;
  }, [state.users.length, selectedUsers.length]);

  const someSelected = useMemo(() => {
    return selectedUsers.length > 0 && selectedUsers.length < state.users.length;
  }, [selectedUsers.length, state.users.length]);

  return {
    // Data
    users: state.users,
    isLoading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    isRefreshing,
    
    // Selection
    selectedUsers,
    allSelected,
    someSelected,
    isSelected,
    
    // Actions
    approveUser,
    denyUser,
    bulkApprove,
    bulkDeny,
    toggleSelection,
    selectAll,
    
    // Pagination
    loadMore,
    
    // Refresh
    refresh,
  };
}
```

---

## Step 2: Create the View Component

**File**: `apps/mobile/src/components/admin/sections/newSignups/NewSignupsView.tsx`

```typescript
// apps/mobile/src/components/admin/sections/newSignups/NewSignupsView.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNewSignupsViewModel } from '@/viewModels/admin/useNewSignupsViewModel';
import { useThemeColors } from '@/contexts/ThemeContext';
import { NewSignupCard } from './NewSignupCard';
import { BulkActionBar } from '@/components/admin/shared/BulkActionBar';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { ErrorState } from '@/components/admin/shared/ErrorState';
import { LoadingState } from '@/components/admin/shared/LoadingState';
import { Users } from 'lucide-react-native';

export function NewSignupsView() {
  const colors = useThemeColors();
  const viewModel = useNewSignupsViewModel();
  const [actionLoading, setActionLoading] = useState(false);

  // Handle approve with confirmation
  const handleApprove = async (userId: string) => {
    Alert.alert(
      'Approve User',
      'Are you sure you want to approve this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            const result = await viewModel.approveUser(userId);
            setActionLoading(false);
            
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to approve user');
            }
          },
        },
      ]
    );
  };

  // Handle deny with confirmation
  const handleDeny = async (userId: string) => {
    Alert.alert(
      'Deny User',
      'Are you sure you want to deny this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await viewModel.denyUser(userId);
            setActionLoading(false);
            
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to deny user');
            }
          },
        },
      ]
    );
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    Alert.alert(
      'Approve Selected Users',
      `Approve ${viewModel.selectedUsers.length} user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            const result = await viewModel.bulkApprove();
            setActionLoading(false);
            
            if (result.success) {
              Alert.alert('Success', 'Users approved successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to approve users');
            }
          },
        },
      ]
    );
  };

  // Handle bulk deny
  const handleBulkDeny = async () => {
    Alert.alert(
      'Deny Selected Users',
      `Deny ${viewModel.selectedUsers.length} user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await viewModel.bulkDeny();
            setActionLoading(false);
            
            if (result.success) {
              Alert.alert('Success', 'Users denied successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to deny users');
            }
          },
        },
      ]
    );
  };

  // Loading state (initial)
  if (viewModel.isLoading && viewModel.users.length === 0) {
    return <LoadingState />;
  }

  // Error state
  if (viewModel.error && viewModel.users.length === 0) {
    return (
      <ErrorState 
        error={viewModel.error} 
        onRetry={viewModel.refresh}
      />
    );
  }

  // Empty state
  if (viewModel.users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No New Signups"
        description="There are no pending user signups at the moment."
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with select all */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.text }]}>
          {viewModel.users.length} pending signup(s)
        </Text>
        <Text
          style={[styles.selectAllText, { color: colors.primary }]}
          onPress={viewModel.selectAll}
        >
          {viewModel.allSelected ? 'Deselect All' : 'Select All'}
        </Text>
      </View>

      {/* User List */}
      <FlatList
        data={viewModel.users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NewSignupCard
            user={item}
            isSelected={viewModel.isSelected(item._id)}
            onToggleSelect={() => viewModel.toggleSelection(item._id)}
            onApprove={() => handleApprove(item._id)}
            onDeny={() => handleDeny(item._id)}
            disabled={actionLoading}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={viewModel.isRefreshing}
            onRefresh={viewModel.refresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={viewModel.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          viewModel.isLoading && viewModel.users.length > 0 ? (
            <View style={styles.footer}>
              <LoadingState size="small" />
            </View>
          ) : null
        }
      />

      {/* Bulk Action Bar */}
      {viewModel.selectedUsers.length > 0 && (
        <BulkActionBar
          selectedCount={viewModel.selectedUsers.length}
          onApprove={handleBulkApprove}
          onDeny={handleBulkDeny}
          disabled={actionLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  footer: {
    paddingVertical: 20,
  },
});
```

---

## Step 3: Create the Card Component

**File**: `apps/mobile/src/components/admin/sections/newSignups/NewSignupCard.tsx`

```typescript
// apps/mobile/src/components/admin/sections/newSignups/NewSignupCard.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Check, X } from 'lucide-react-native';
import type { User } from '@/types/admin';

interface NewSignupCardProps {
  user: User;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onDeny: () => void;
  disabled?: boolean;
}

export function NewSignupCard({
  user,
  isSelected,
  onToggleSelect,
  onApprove,
  onDeny,
  disabled = false,
}: NewSignupCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      {/* Checkbox */}
      <TouchableOpacity
        onPress={onToggleSelect}
        disabled={disabled}
        style={styles.checkbox}
      >
        <View
          style={[
            styles.checkboxInner,
            {
              backgroundColor: isSelected ? colors.primary : 'transparent',
              borderColor: isSelected ? colors.primary : colors.border,
            },
          ]}
        >
          {isSelected && (
            <Check size={16} color={colors.background} strokeWidth={3} />
          )}
        </View>
      </TouchableOpacity>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {user.email}
        </Text>
        <View style={styles.metadata}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {user.accountType}
            </Text>
          </View>
          {user.doctorSpecialty && (
            <Text style={[styles.specialty, { color: colors.textSecondary }]}>
              {user.doctorSpecialty}
            </Text>
          )}
        </View>
        {user.medicalLicense && (
          <Text style={[styles.license, { color: colors.textSecondary }]}>
            License: {user.medicalLicense}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onApprove}
          disabled={disabled}
          style={[
            styles.actionButton,
            styles.approveButton,
            { backgroundColor: colors.success + '20' },
          ]}
        >
          <Check size={20} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDeny}
          disabled={disabled}
          style={[
            styles.actionButton,
            styles.denyButton,
            { backgroundColor: colors.error + '20' },
          ]}
        >
          <X size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  specialty: {
    fontSize: 12,
  },
  license: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {},
  denyButton: {},
});
```

---

## Step 4: Integration into Main Dashboard

**File**: `apps/mobile/src/components/admin/AdminDashboardView.tsx` (excerpt)

```typescript
import { NewSignupsView } from './sections/newSignups/NewSignupsView';
import { UserPlus } from 'lucide-react-native';

const sections = [
  {
    id: 'newSignups',
    title: 'New Signups',
    icon: UserPlus,
    component: NewSignupsView,
  },
  // ... other sections
];

// In render:
<Accordion allowMultiple={false}>
  {sections.map((section) => (
    <AccordionItem
      key={section.id}
      title={section.title}
      icon={<section.icon size={20} color={colors.primary} />}
    >
      <section.component />
    </AccordionItem>
  ))}
</Accordion>
```

---

## Checklist for Each Section

When implementing a new section, follow this checklist:

### Planning
- [ ] Identify data requirements
- [ ] List all actions needed
- [ ] Design component structure
- [ ] Identify reusable components

### ViewModel Implementation
- [ ] Create ViewModel file
- [ ] Define state interface
- [ ] Implement state management
- [ ] Add API calls
- [ ] Implement all actions
- [ ] Add error handling
- [ ] Add loading states
- [ ] Implement pagination (if needed)
- [ ] Add refresh logic
- [ ] Export clean API

### View Implementation
- [ ] Create View file
- [ ] Implement ViewModel usage
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Handle empty state
- [ ] Implement main UI
- [ ] Add user interactions
- [ ] Implement confirmations
- [ ] Add pull-to-refresh
- [ ] Style components

### Sub-components
- [ ] Create card/item components
- [ ] Create modal components (if needed)
- [ ] Create form components (if needed)
- [ ] Implement proper props types
- [ ] Add styling

### Testing
- [ ] Test happy path
- [ ] Test error scenarios
- [ ] Test loading states
- [ ] Test empty states
- [ ] Test user interactions
- [ ] Test confirmations
- [ ] Test pagination
- [ ] Test refresh

### Integration
- [ ] Add to section list
- [ ] Test in accordion
- [ ] Verify navigation
- [ ] Test with other sections

---

## Common Patterns

### Pattern 1: Async Action with Confirmation

```typescript
const handleAction = async (itemId: string) => {
  Alert.alert(
    'Confirm Action',
    'Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setLoading(true);
          const result = await viewModel.performAction(itemId);
          setLoading(false);
          
          if (result.success) {
            Alert.alert('Success', 'Action completed');
          } else {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]
  );
};
```

### Pattern 2: Search with Debounce

```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 500);

useEffect(() => {
  if (debouncedSearch) {
    viewModel.search(debouncedSearch);
  }
}, [debouncedSearch]);
```

### Pattern 3: Infinite Scroll

```typescript
<FlatList
  data={items}
  onEndReached={viewModel.loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    viewModel.isLoading ? <LoadingSpinner /> : null
  }
/>
```

### Pattern 4: Pull to Refresh

```typescript
<FlatList
  data={items}
  refreshControl={
    <RefreshControl
      refreshing={viewModel.isRefreshing}
      onRefresh={viewModel.refresh}
    />
  }
/>
```

---

## Tips for LLM Implementation

1. **Start with the ViewModel**: Define your data flow first
2. **Use TypeScript**: Leverage types for better errors and autocomplete
3. **Keep components small**: Break down complex UIs
4. **Handle all states**: Loading, error, empty, and success
5. **Add confirmations**: For destructive actions
6. **Test incrementally**: Test each piece as you build
7. **Reuse components**: Use shared components when possible
8. **Follow naming conventions**: Keep names consistent
9. **Add comments**: Especially for complex logic
10. **Think mobile-first**: Consider touch targets, gestures, and mobile UX

---

## Next Steps

After implementing a section using this template:

1. Test thoroughly on both iOS and Android
2. Add to the main dashboard
3. Update documentation
4. Move to the next section
5. Refactor common patterns into shared utilities

---

**Remember**: Each section should be self-contained and independently testable!