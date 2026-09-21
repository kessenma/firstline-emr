import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { Button } from '../ui/Button';
import { UploadResult } from '../../utils/csvParser';

interface UploadResultsSummaryProps {
  results: UploadResult[];
  onDone: () => void;
}

export function UploadResultsSummary({
  results,
  onDone,
}: UploadResultsSummaryProps) {
  const colors = useThemeColors();
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <View style={styles.container}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.success + '15', borderColor: colors.success },
          ]}
        >
          <CheckCircle2 size={20} color={colors.success} />
          <Text style={[styles.summaryCount, { color: colors.success }]}>
            {successCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.success }]}>
            Succeeded
          </Text>
        </View>

        {failCount > 0 && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.error + '15',
                borderColor: colors.error,
              },
            ]}
          >
            <AlertCircle size={20} color={colors.error} />
            <Text style={[styles.summaryCount, { color: colors.error }]}>
              {failCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.error }]}>
              Failed
            </Text>
          </View>
        )}
      </View>

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.row)}
        style={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.resultRow,
              {
                borderColor: item.success ? colors.success + '40' : colors.error + '40',
                backgroundColor: colors.surface,
              },
            ]}
          >
            {item.success ? (
              <CheckCircle2 size={16} color={colors.success} />
            ) : (
              <AlertCircle size={16} color={colors.error} />
            )}
            <View style={styles.resultInfo}>
              <Text style={[styles.resultName, { color: colors.text }]}>
                Row {item.row}: {item.name}
              </Text>
              {item.error && (
                <Text style={[styles.resultError, { color: colors.error }]}>
                  {item.error}
                </Text>
              )}
            </View>
          </View>
        )}
      />

      <Button
        onPress={onDone}
        style={[styles.doneButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.doneText, { color: colors.textInverse }]}>Done</Text>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  resultError: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  doneButton: {
    borderRadius: 24,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  doneText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
