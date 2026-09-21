// apps/mobile/src/components/tablet/TabletTableHeader.tsx
// Header row with sortable columns for iPad table

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';
import type { TabletColumn } from './tabletTableColumns';

export type SortDirection = 'asc' | 'desc' | null;

interface TabletTableHeaderProps {
  columns: TabletColumn[];
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  frozenColumnWidth: number;
}

export const TabletTableHeader: React.FC<TabletTableHeaderProps> = ({
  columns,
  sortKey,
  sortDirection,
  onSort,
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.headerRow}>
      {columns.map(col => {
        const isActive = sortKey === col.key;
        const indicator = isActive ? (sortDirection === 'asc' ? ' \u25B2' : ' \u25BC') : '';

        return (
          <TouchableOpacity
            key={col.key}
            style={[
              styles.headerCell,
              { width: col.width, backgroundColor: colors.surface },
            ]}
            onPress={() => col.sortable && onSort(col.key)}
            disabled={!col.sortable}
            activeOpacity={col.sortable ? 0.6 : 1}
          >
            <Text
              style={[
                styles.headerText,
                { color: colors.text },
                isActive && styles.headerTextActive,
              ]}
              numberOfLines={1}
            >
              {col.label}{indicator}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    minHeight: 40,
    alignItems: 'stretch',
  },
  headerCell: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  headerTextActive: {
    fontWeight: typography.fontWeight.extrabold,
  },
});
