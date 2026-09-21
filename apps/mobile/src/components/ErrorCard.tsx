import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useThemeColors } from '../contexts/ThemeContext';

interface ErrorCardProps {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  onRetry,
  onDismiss,
  title = 'Error',
}) => {
  const colors = useThemeColors();
  const [copied, setCopied] = useState(false);

  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' && error.stack ? error.stack : '';

  const handleCopy = () => {
    const fullError = errorStack || errorMessage;
    Clipboard.setString(fullError);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}>
      <View style={styles.errorHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>
        <Text style={[styles.errorTitle, { color: colors.error }]}>{title}</Text>
      </View>

      <View style={styles.errorContent}>
        <Text style={[styles.errorText, { color: colors.errorDark }]} numberOfLines={3}>
          {errorMessage}
        </Text>

        {errorStack && (
          <View style={[styles.stackContainer, { backgroundColor: colors.backgroundTertiary }]}>
            <Text style={[styles.stackLabel, { color: colors.errorDark }]}>Stack Trace:</Text>
            <Text style={[styles.stackText, { color: colors.errorDark }]} numberOfLines={5}>
              {errorStack}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.info }]} onPress={handleCopy}>
          <Text style={[styles.copyButtonText, { color: colors.textInverse }]}>
            {copied ? '✓ Copied!' : '📋 Copy Error'}
          </Text>
        </TouchableOpacity>

        {onRetry && (
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.success }]} onPress={onRetry}>
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>🔄 Retry</Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity style={[styles.dismissButton, { backgroundColor: colors.textSecondary }]} onPress={onDismiss}>
            <Text style={[styles.dismissButtonText, { color: colors.textInverse }]}>✕ Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 8,
  },
  errorIcon: {
    fontSize: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorContent: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  stackContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  stackLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  stackText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
