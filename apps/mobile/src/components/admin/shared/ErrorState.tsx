// apps/mobile/src/components/admin/shared/ErrorState.tsx
// Error state component for admin sections

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../../utils/theme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
  showDetails?: boolean; // Add this prop
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data.',
  error,
  onRetry,
  retryLabel = 'Try Again',
  showDetails = true, // Default to true for debugging
}: ErrorStateProps) {
  const colors = useThemeColors();
  const [showFullError, setShowFullError] = useState(false);

  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
        <AlertCircle size={48} color={colors.error} strokeWidth={2} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>

      {showDetails && errorMessage && (
        <View style={styles.errorDetails}>
          <TouchableOpacity
            onPress={() => setShowFullError(!showFullError)}
            style={[styles.errorToggle, { borderColor: colors.border }]}
          >
            <Text style={[styles.errorToggleText, { color: colors.textSecondary }]}>
              {showFullError ? 'Hide' : 'Show'} Error Details
            </Text>
          </TouchableOpacity>
          
          {showFullError && (
            <View style={[styles.errorBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          )}
        </View>
      )}

      {onRetry && (
        <View
          style={[styles.retryButton, { 
            backgroundColor: colors.primary,
          }]}
        >
          <Text
            style={[styles.retryButtonText, { color: colors.textInverse }]}
            onPress={onRetry}
          >
            <RefreshCw size={16} color={colors.textInverse} /> {retryLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    minHeight: 300,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
    maxWidth: 400,
  },
  errorDetails: {
    marginTop: spacing.md,
    width: '100%',
  },
  errorToggle: {
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  errorToggleText: {
    fontSize: typography.fontSize.sm,
  },
  errorBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
