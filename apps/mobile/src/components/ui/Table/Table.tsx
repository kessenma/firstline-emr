// apps/mobile/src/components/ui/Table/Table.tsx
// Table component with card-based layout for React Native

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Activity,
  AlertTriangle,
  Stethoscope,
  StickyNote,
  MessageSquare,
  User,
  IdCard,
  Languages,
} from 'lucide-react-native';
import type { TableProps } from './types';
import { Card, CardContent } from '../Card';
import { RoleIcon } from '../RoleIcon';
import {
  lightTheme,
  spacing,
  borderRadius,
  typography,
} from '../../../utils/theme';
import { palette } from '../../../utils/colors';
import { dobToAge, formatLocation } from '../../../utils/patientUtils';

const ICON_COLOR = palette.orange[700];
const ICON_SIZE = 16;

/**
 * Table component with card-based layout
 * Displays data in a vertical card layout optimized for mobile screens
 */
export function Table<T>({
  data,
  columns: _columns,
  onRowClick,
  backgroundColor: _backgroundColor = 'background',
  textColor: _textColor = 'foreground',
  borderColor: _borderColor = 'border',
  hoverBackgroundColor: _hoverBackgroundColor = 'muted/50',
  hoverTextColor: _hoverTextColor = 'foreground',
  renderActions,
  isLoading = false,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  // Render icon based on field key
  const renderIcon = (key: string) => {
    const iconProps = {
      size: ICON_SIZE,
      color: ICON_COLOR,
    };

    switch (key) {
      case 'status':
        return <Activity {...iconProps} />;
      case 'priority':
        return <AlertTriangle {...iconProps} />;
      case 'specialty':
        return <Stethoscope {...iconProps} />;
      case 'notes':
      case 'dashboardNotes':
        return <StickyNote {...iconProps} />;
      case 'telegramChatId':
        return <MessageSquare {...iconProps} />;
      case 'user':
      case 'triagedBy':
        return <User {...iconProps} />;
      case 'doctor':
        return <RoleIcon accountType="Doctor" {...iconProps} />;
      case 'id':
      case '_id':
        return <IdCard {...iconProps} />;
      case 'language':
        return <Languages {...iconProps} />;
      default:
        return null;
    }
  };

  // Render a field with label, icon, and value
  const renderField = (
    label: string,
    value: string | React.ReactNode,
    iconKey?: string,
  ) => {
    return (
      <View style={styles.fieldRow}>
        <View style={styles.fieldLabel}>
          {iconKey && renderIcon(iconKey)}
          <Text style={styles.fieldLabelText}>{label}:</Text>
        </View>
        <View style={styles.fieldValue}>
          <Text style={styles.fieldValueText}>{value || 'N/A'}</Text>
        </View>
      </View>
    );
  };

  // Render icon-only field (no text label)
  const renderIconOnly = (value: string | React.ReactNode, iconKey: string) => {
    return (
      <View style={styles.fieldRow}>
        <View style={styles.iconOnlyLabel}>{renderIcon(iconKey)}</View>
        <View style={styles.fieldValue}>
          <Text style={styles.fieldValueText}>{value || 'N/A'}</Text>
        </View>
      </View>
    );
  };

  // Render read-only field (similar to web's ReadOnlyField)
  const renderReadOnlyField = (
    label: string,
    value: string,
    _fieldName: string,
  ) => {
    return (
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyFieldLabel}>{label}:</Text>
        <View style={styles.readOnlyFieldValue}>
          <Text style={styles.readOnlyFieldValueText}>{value}</Text>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ICON_COLOR} />
        <Text style={styles.centerText}>Loading...</Text>
      </View>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {data.map((item: any, index) => {
        // Extract patient data directly from the item
        const lastName = item.lastName || '';
        const age = item.dob ? dobToAge(item.dob.toString()) : '';
        const location = formatLocation(item.city || '', item.country || '');
        const language = item.language || '';
        const chiefComplaint = item.chiefComplaint || '';
        const patientId = item._id || item.id || '';
        const status = item.status || 'Pre-Op / Not Cleared';
        const priority = item.priority || 'Not Selected';
        const specialty =
          item.specialties && Array.isArray(item.specialties)
            ? item.specialties.length === 1
              ? item.specialties[0]
              : item.specialties.length > 1
              ? `${item.specialties.length} specialties`
              : 'Not Selected'
            : item.specialty || 'Not Selected';
        const unreadMessages = item.unreadMessages || 0;
        const notes = item.dashboardNotes || '';
        const hasNotes = notes && notes.trim().length > 0;

        // Handle complex objects
        const triagedBy = item.triagedBy
          ? typeof item.triagedBy === 'object'
            ? `${item.triagedBy.firstName || ''} ${
                item.triagedBy.lastName || ''
              }`.trim() || 'N/A'
            : String(item.triagedBy)
          : 'N/A';

        const doctor = item.doctor
          ? typeof item.doctor === 'object'
            ? `${item.doctor.firstName || ''} ${
                item.doctor.lastName || ''
              }`.trim() || 'N/A'
            : String(item.doctor)
          : 'N/A';

        return (
          <TouchableOpacity
            key={`mobile-row-${index}`}
            activeOpacity={0.7}
            onPress={() => onRowClick?.(item)}
            style={styles.cardWrapper}
          >
            <Card style={styles.card}>
              <CardContent style={styles.cardContent}>
                {/* Top section - Patient basic info */}
                <View style={styles.topSection}>
                  {/* Row 1: Last Initial and Age */}
                  <View style={styles.row}>
                    <View style={[styles.cell, styles.cellBordered]}>
                      {renderField('Last Initial', lastName)}
                    </View>
                    <View style={styles.cell}>{renderField('Age', age)}</View>
                  </View>

                  {/* Row 2: Location and Language */}
                  <View style={styles.row}>
                    <View style={styles.cell}>
                      {renderField('Location', location)}
                    </View>
                    <View style={styles.cell}>
                      {renderIconOnly(language, 'language')}
                    </View>
                  </View>

                  {/* Chief Complaint in ReadOnlyField */}
                  {chiefComplaint && (
                    <View style={styles.chiefComplaintSection}>
                      {renderReadOnlyField(
                        'Chief Complaint',
                        chiefComplaint,
                        'chiefComplaint',
                      )}
                    </View>
                  )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Bottom section - Patient medical info */}
                <View style={styles.bottomSection}>
                  {renderIconOnly(patientId, 'id')}
                  {renderField('Status', status, 'status')}
                  {renderField('Priority', priority, 'priority')}
                  {renderIconOnly(specialty, 'specialty')}

                  {/* Show unread messages if any */}
                  {unreadMessages > 0 && (
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldLabel}>
                        {renderIcon('telegramChatId')}
                        <Text style={styles.fieldLabelText}>Messages:</Text>
                      </View>
                      <View style={styles.fieldValue}>
                        <Text style={styles.fieldValueText}>
                          {unreadMessages} unread
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Only show notes if they exist */}
                  {hasNotes && (
                    <View style={styles.notesSection}>
                      {renderReadOnlyField(
                        'Additional Notes',
                        notes,
                        'additionalNotes',
                      )}
                    </View>
                  )}

                  {/* Triaged By and Doctor side by side */}
                  <View style={styles.row}>
                    <View style={styles.cell}>
                      {renderIconOnly(triagedBy, 'user')}
                    </View>
                    <View style={styles.cell}>
                      {renderIconOnly(doctor, 'doctor')}
                    </View>
                  </View>
                </View>

                {/* Action buttons */}
                {renderActions && (
                  <View style={styles.actionsSection}>
                    {renderActions(item)}
                  </View>
                )}
              </CardContent>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.backgroundSecondary,
  },
  contentContainer: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  centerText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: lightTheme.colors.textSecondary,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
  },
  cardWrapper: {
    marginBottom: spacing.base,
  },
  card: {
    backgroundColor: lightTheme.colors.surface,
    borderWidth: 2,
    borderColor: lightTheme.colors.border,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: spacing.base,
  },
  topSection: {
    gap: spacing.md,
  },
  bottomSection: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  cell: {
    flex: 1,
  },
  cellBordered: {
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: lightTheme.colors.border,
    paddingTop: spacing.xs,
    paddingRight: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 120,
  },
  fieldLabelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: lightTheme.colors.textSecondary,
  },
  iconOnlyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldValue: {
    flex: 1,
  },
  fieldValueText: {
    fontSize: typography.fontSize.sm,
    color: lightTheme.colors.text,
    flexWrap: 'wrap',
  },
  readOnlyField: {
    marginVertical: spacing.sm,
  },
  readOnlyFieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: lightTheme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  readOnlyFieldValue: {
    backgroundColor: lightTheme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  readOnlyFieldValueText: {
    fontSize: typography.fontSize.base,
    color: lightTheme.colors.text,
  },
  chiefComplaintSection: {
    marginTop: spacing.sm,
  },
  notesSection: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: lightTheme.colors.border,
    marginVertical: spacing.base,
  },
  actionsSection: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.divider,
  },
});
