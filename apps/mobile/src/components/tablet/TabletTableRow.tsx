// apps/mobile/src/components/tablet/TabletTableRow.tsx
// Single data row renderer for iPad tablet patient table
// Individual cells are tappable — name navigates to chart, action columns open sheets

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import type { PatientWithMessages } from '../../types/patient';
import type { TabletColumn } from './tabletTableColumns';
import { getCellValue } from './tabletTableColumns';
import {
  getInitials,
  getStatusColor,
  getPriorityColor,
} from '../../utils/patientUtils';

// Columns that open action sheets when tapped
const ACTIONABLE_COLUMNS = new Set([
  'name', 'status', 'priority', 'hospital_name', 'specialty', 'triage_note',
]);

interface TabletTableRowProps {
  patient: PatientWithMessages;
  columns: TabletColumn[];
  onCellPress: (patient: PatientWithMessages, columnKey: string) => void;
  isActive: boolean;
  frozenColumnWidth: number;
  rowIndex: number;
}

export const TabletTableRow: React.FC<TabletTableRowProps> = ({
  patient,
  columns,
  onCellPress,
  isActive,
  rowIndex,
}) => {
  const colors = useThemeColors();
  const isEven = rowIndex % 2 === 0;
  const rowBg = isActive
    ? colors.surfaceTertiary
    : isEven
      ? colors.background
      : colors.surface;

  const renderCell = (col: TabletColumn) => {
    const value = getCellValue(patient, col.key);
    const isActionable = ACTIONABLE_COLUMNS.has(col.key);

    const cellContent = (() => {
      switch (col.key) {
        case 'name': {
          const statusColors = getStatusColor(patient.status || '');
          const initials = getInitials(patient.firstName, patient.lastName);
          return (
            <>
              <View style={[styles.initialsCircle, { backgroundColor: statusColors.background }]}>
                <Text style={[styles.initialsText, { color: statusColors.text }]}>
                  {initials}
                </Text>
              </View>
              <Text style={[styles.nameText, { color: colors.primary }]} numberOfLines={1}>
                {String(value)}
              </Text>
            </>
          );
        }

        case 'status': {
          const statusColors = getStatusColor(String(value));
          return String(value) !== '' ? (
            <View style={[styles.badge, { backgroundColor: statusColors.background }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]} numberOfLines={1}>
                {String(value)}
              </Text>
            </View>
          ) : null;
        }

        case 'priority': {
          const priorityColors = getPriorityColor(String(value));
          return String(value) !== '' ? (
            <View style={[styles.badge, { backgroundColor: priorityColors.background }]}>
              <Text style={[styles.badgeText, { color: priorityColors.text }]} numberOfLines={1}>
                {String(value)}
              </Text>
            </View>
          ) : null;
        }

        case 'unreadMessages': {
          const count = typeof value === 'number' ? value : 0;
          return count > 0 ? (
            <View style={[styles.msgBadge, { backgroundColor: colors.error }]}>
              <Text style={[styles.msgBadgeText, { color: colors.textInverse }]}>{count}</Text>
            </View>
          ) : null;
        }

        default:
          return (
            <Text style={[styles.cellText, { color: isActionable ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
              {String(value)}
            </Text>
          );
      }
    })();

    if (isActionable) {
      return (
        <TouchableOpacity
          key={col.key}
          style={[styles.cell, { width: col.width }]}
          onPress={() => onCellPress(patient, col.key)}
          activeOpacity={0.6}
        >
          {cellContent}
        </TouchableOpacity>
      );
    }

    return (
      <View key={col.key} style={[styles.cell, { width: col.width }]}>
        {cellContent}
      </View>
    );
  };

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderBottomColor: colors.borderLight }]}>
      {columns.map(col => renderCell(col))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  initialsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  initialsText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  nameText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  cellText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  msgBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});
