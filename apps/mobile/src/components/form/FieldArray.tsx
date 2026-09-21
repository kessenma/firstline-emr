// apps/mobile/src/components/form/FieldArray.tsx
// Dynamic field array component for managing lists of items (e.g., companions)

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface FieldArrayProps<T> {
  label?: string;
  helperText?: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  addButtonText?: string;
  emptyMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
  maxItems?: number;
  minItems?: number;
  showItemNumbers?: boolean;
}

export function FieldArray<T>({
  label,
  helperText,
  items,
  onAdd,
  onRemove,
  renderItem,
  addButtonText = 'Add Item',
  emptyMessage = 'No items added yet',
  containerStyle,
  maxItems,
  minItems = 0,
  showItemNumbers = true,
}: FieldArrayProps<T>) {
  const colors = useThemeColors();

  const canAdd = !maxItems || items.length < maxItems;
  const canRemove = items.length > minItems;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.text,
              fontSize: typography.fontSize.sm,
            },
          ]}
        >
          {label}
        </Text>
      )}

      {helperText && (
        <Text
          style={[
            styles.helperText,
            {
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      )}

      {items.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.emptyMessage,
              {
                color: colors.textSecondary,
                fontSize: typography.fontSize.sm,
              },
            ]}
          >
            {emptyMessage}
          </Text>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.itemHeader}>
                {showItemNumbers && (
                  <View
                    style={[
                      styles.itemNumber,
                      {
                        backgroundColor: colors.primary + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.itemNumberText,
                        {
                          color: colors.primary,
                          fontSize: typography.fontSize.xs,
                        },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                )}

                {canRemove && (
                  <TouchableOpacity
                    onPress={() => onRemove(index)}
                    style={[
                      styles.removeButton,
                      {
                        backgroundColor: colors.error + '10',
                      },
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.itemContent}>{renderItem(item, index)}</View>
            </View>
          ))}
        </View>
      )}

      {canAdd && (
        <TouchableOpacity
          onPress={onAdd}
          style={[
            styles.addButton,
            {
              backgroundColor: colors.primary + '10',
              borderColor: colors.primary,
            },
          ]}
        >
          <Plus size={18} color={colors.primary} />
          <Text
            style={[
              styles.addButtonText,
              {
                color: colors.primary,
                fontSize: typography.fontSize.sm,
              },
            ]}
          >
            {addButtonText}
          </Text>
        </TouchableOpacity>
      )}

      {maxItems && items.length >= maxItems && (
        <Text
          style={[
            styles.maxItemsMessage,
            {
              color: colors.textSecondary,
              fontSize: typography.fontSize.xs,
            },
          ]}
        >
          Maximum of {maxItems} items reached
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  helperText: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emptyState: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyMessage: {
    fontStyle: 'italic',
  },
  itemsList: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  itemContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberText: {
    fontWeight: '700',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addButtonText: {
    fontWeight: '600',
  },
  maxItemsMessage: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default FieldArray;
