// apps/mobile/src/components/messages/UserSearchInput.tsx
// Teams-style user search input with selected user chips

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';

export interface SearchableUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  image?: string;
}

// Simple cache for user search results
const searchCache = new Map<string, { users: SearchableUser[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

interface UserSearchInputProps {
  selectedUsers: SearchableUser[];
  onUserSelect: (user: SearchableUser) => void;
  onUserRemove: (userId: string) => void;
  excludeUserIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function UserSearchInput({
  selectedUsers,
  onUserSelect,
  onUserRemove,
  excludeUserIds = [],
  placeholder = 'Search by name or email...',
  disabled = false,
}: UserSearchInputProps) {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Memoize excluded IDs
  const excludedIdsSet = useMemo(() => {
    const selectedIds = selectedUsers.map((u) => u.id);
    return new Set([...excludeUserIds, ...selectedIds]);
  }, [excludeUserIds, selectedUsers]);

  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      const cacheKey = searchQuery.toLowerCase();
      const cached = searchCache.get(cacheKey);
      const now = Date.now();

      // Use cached results if fresh
      if (cached && now - cached.timestamp < CACHE_TTL) {
        const filtered = cached.users.filter((u) => !excludedIdsSet.has(u.id));
        setResults(filtered);
        return;
      }

      setIsLoading(true);
      try {
        const token = storageUtils.getToken();
        const url = getApiUrl(`/users/search?q=${encodeURIComponent(searchQuery)}`);

        console.log('[UserSearch] Searching for:', searchQuery);
        console.log('[UserSearch] URL:', url);
        console.log('[UserSearch] Token available:', !!token);

        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        console.log('[UserSearch] Response status:', res.status);

        if (res.ok) {
          const data = await res.json();
          console.log('[UserSearch] Results received:', data.users?.length || 0, 'users');
          if (data.users?.length > 0) {
            console.log('[UserSearch] First user:', data.users[0].firstName, data.users[0].lastName);
          }

          // Cache the raw results
          searchCache.set(cacheKey, { users: data.users || [], timestamp: now });

          // Filter out excluded users
          const filtered = (data.users || []).filter(
            (u: SearchableUser) => !excludedIdsSet.has(u.id),
          );
          console.log('[UserSearch] Filtered results:', filtered.length, 'users');
          setResults(filtered);
        } else {
          const errorText = await res.text();
          console.error('[UserSearch] API error:', res.status, errorText);
        }
      } catch (error) {
        console.error('[UserSearch] Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [excludedIdsSet],
  );

  // Debounced search - only trigger on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive filtered results using useMemo instead of useEffect to avoid infinite loops
  const filteredResults = useMemo(() => {
    return results.filter((u) => !excludedIdsSet.has(u.id));
  }, [results, excludedIdsSet]);

  const handleSelect = (user: SearchableUser) => {
    onUserSelect(user);
    setQuery('');
    setResults([]);
  };

  const getInitials = (user: SearchableUser) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const renderSelectedChip = (user: SearchableUser) => (
    <View
      key={user.id}
      style={[styles.chip, { backgroundColor: colors.primary + '20' }]}
    >
      <View style={[styles.chipAvatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.chipAvatarText, { color: colors.textInverse }]}>
          {getInitials(user)}
        </Text>
      </View>
      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
        {user.firstName} {user.lastName}
      </Text>
      <TouchableOpacity
        onPress={() => onUserRemove(user.id)}
        style={styles.chipRemove}
        disabled={disabled}
      >
        <Text style={[styles.chipRemoveText, { color: colors.textSecondary }]}>
          ✕
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }: { item: SearchableUser }) => (
    <TouchableOpacity
      style={[styles.resultItem, { backgroundColor: colors.surface }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultAvatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.resultAvatarText, { color: colors.textInverse }]}>
          {getInitials(item)}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.text }]}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={[styles.resultEmail, { color: colors.textSecondary }]}>
          {item.email} • {item.accountType}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>To:</Text>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <View style={styles.chipsContainer}>
          {selectedUsers.map(renderSelectedChip)}
        </View>
      )}

      {/* Search input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: isFocused ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={selectedUsers.length === 0 ? placeholder : 'Add more...'}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Results dropdown */}
      {isFocused && filteredResults.length > 0 && (
        <View
          style={[
            styles.resultsContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <FlatList
            data={filteredResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.resultsList}
          />
        </View>
      )}

      {/* No results message */}
      {isFocused && query.length >= 2 && !isLoading && filteredResults.length === 0 && (
        <View
          style={[
            styles.noResults,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
            No users found
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    maxWidth: 120,
  },
  chipRemove: {
    padding: spacing.xs,
  },
  chipRemoveText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.xs,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: borderRadius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    marginTop: -1,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  resultEmail: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  noResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: borderRadius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: spacing.md,
    marginTop: -1,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
  },
});

export default UserSearchInput;
