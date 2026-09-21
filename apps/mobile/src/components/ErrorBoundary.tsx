import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorCard } from './ErrorCard';
import { useThemeColors } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/** Functional inner component so we can use useThemeColors() hook */
const ErrorBoundaryFallback: React.FC<{
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}> = ({ error, errorInfo, onReset }) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            The app encountered an unexpected error. You can copy the error details and report
            it to the development team.
          </Text>
        </View>

        <ErrorCard
          error={error}
          onRetry={onReset}
          title="Application Error"
        />

        {errorInfo && (
          <View style={[styles.infoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Component Stack:</Text>
            <View style={[styles.stackContainer, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.stackText, { color: colors.textSecondary }]}>{errorInfo.componentStack}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.resetButton, { backgroundColor: colors.info }]} onPress={onReset}>
            <Text style={[styles.resetButtonText, { color: colors.textInverse }]}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 [ErrorBoundary] getDerivedStateFromError:', error.message);
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [ErrorBoundary] Caught an error:', error);
    console.error('🚨 [ErrorBoundary] Error message:', error.message);
    console.error('🚨 [ErrorBoundary] Error stack:', error.stack);
    console.error('🚨 [ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  infoContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stackContainer: {
    padding: 12,
    borderRadius: 6,
  },
  stackText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  footer: {
    marginTop: 24,
    marginBottom: 40,
  },
  resetButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
