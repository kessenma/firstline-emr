// Presentational component for LLM proofreading suggestions below a field.
// Shows checking indicator, suggestion cards with accept/dismiss, or nothing.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { ProofreadingSuggestion, ProofreadingStatus } from './useProofreadingSuggestions';

interface ProofreadingSuggestionCardProps {
  suggestions: ProofreadingSuggestion[];
  status: ProofreadingStatus;
  onAccept: (suggestion: ProofreadingSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
}

export const ProofreadingSuggestionCard: React.FC<ProofreadingSuggestionCardProps> = ({
  suggestions,
  status,
  onAccept,
  onDismiss,
  onAcceptAll,
  onDismissAll,
}) => {
  const colors = useThemeColors();

  if (status === 'checking') {
    return (
      <View style={[styles.checkingContainer, { backgroundColor: colors.info + '10' }]}>
        <ActivityIndicator size={14} color={colors.info} />
        <Text style={[styles.checkingText, { color: colors.info }]}>Checking...</Text>
      </View>
    );
  }

  if (suggestions.length === 0) return null;

  const handleAccept = (suggestion: ProofreadingSuggestion) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onAccept(suggestion);
  };

  const handleDismiss = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onDismiss(id);
  };

  return (
    <View style={styles.container}>
      {suggestions.length > 1 && (
        <View style={styles.bulkRow}>
          <TouchableOpacity
            style={[styles.bulkButton, { backgroundColor: colors.success + '15' }]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onAcceptAll();
            }}
          >
            <Check size={12} color={colors.success} />
            <Text style={[styles.bulkButtonText, { color: colors.success }]}>
              Accept All ({suggestions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onDismissAll();
            }}
          >
            <Text style={[styles.bulkButtonText, { color: colors.textSecondary }]}>
              Dismiss All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {suggestions.map(suggestion => (
        <View
          key={suggestion.id}
          style={[
            styles.suggestionCard,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          ]}
        >
          <View style={styles.textRow}>
            <Text style={[styles.originalText, { color: colors.error }]}>
              &ldquo;{suggestion.original}&rdquo;
            </Text>
            <Text style={[styles.arrow, { color: colors.textSecondary }]}> → </Text>
            <Text style={[styles.correctedText, { color: colors.success }]}>
              &ldquo;{suggestion.corrected}&rdquo;
            </Text>
          </View>
          {suggestion.reason ? (
            <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
              {suggestion.reason}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
              onPress={() => handleAccept(suggestion)}
            >
              <Check size={12} color={colors.success} />
              <Text style={[styles.actionButtonText, { color: colors.success }]}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDismiss(suggestion.id)}
            >
              <X size={12} color={colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  checkingText: {
    fontSize: typography.fontSize.xs,
  },
  bulkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  bulkButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  suggestionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  originalText: {
    fontSize: typography.fontSize.xs,
    textDecorationLine: 'line-through',
  },
  arrow: {
    fontSize: typography.fontSize.xs,
  },
  correctedText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  reasonText: {
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
