// apps/mobile/src/components/tablet/TabletPatientTable.tsx
// Simple horizontally scrollable table for iPad tablet patient dashboard

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';
import type { PatientWithMessages } from '../../types/patient';
import {
  TABLET_COLUMNS,
  FROZEN_COLUMN_WIDTH,
  getCellValue,
} from './tabletTableColumns';
import { TabletTableHeader, type SortDirection } from './TabletTableHeader';
import { TabletTableRow } from './TabletTableRow';

interface TabletPatientTableProps {
  data: PatientWithMessages[];
  onCellPress: (patient: PatientWithMessages, columnKey: string) => void;
  activePatientId?: string | null;
  isLoading: boolean;
}

const ROW_HEIGHT = 48;
const totalWidth = TABLET_COLUMNS.reduce((sum, c) => sum + c.width, 0);

export const TabletPatientTable: React.FC<TabletPatientTableProps> = ({
  data,
  onCellPress,
  activePatientId,
  isLoading,
}) => {
  const colors = useThemeColors();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = useCallback((key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortKey(null);
      setSortDirection(null);
    }
  }, [sortKey, sortDirection]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = getCellValue(a, sortKey);
      const bVal = getCellValue(b, sortKey);

      if (aVal === '' && bVal !== '') return 1;
      if (aVal !== '' && bVal === '') return -1;
      if (aVal === '' && bVal === '') return 0;

      let cmp: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' });
      }

      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [data, sortKey, sortDirection]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  }), []);

  const renderRow = useCallback(({ item, index }: ListRenderItemInfo<PatientWithMessages>) => (
    <TabletTableRow
      patient={item}
      columns={TABLET_COLUMNS}
      onCellPress={onCellPress}
      isActive={item.id === activePatientId}
      frozenColumnWidth={FROZEN_COLUMN_WIDTH}
      rowIndex={index}
    />
  ), [onCellPress, activePatientId]);

  const keyExtractor = useCallback((item: PatientWithMessages) => item.id, []);

  if (isLoading && data.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No patients found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width: totalWidth }}>
          {/* Header */}
          <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TabletTableHeader
              columns={TABLET_COLUMNS}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              frozenColumnWidth={FROZEN_COLUMN_WIDTH}
            />
          </View>

          {/* Rows */}
          <FlatList
            data={sortedData}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  headerContainer: {
    borderBottomWidth: 2,
  },
});
