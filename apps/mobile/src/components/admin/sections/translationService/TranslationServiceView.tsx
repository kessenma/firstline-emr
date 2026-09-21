// apps/mobile/src/components/admin/sections/translationService/TranslationServiceView.tsx
// View for translation service health monitoring

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import {
  Languages,
  Trash2,
  Play,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useTranslationServiceViewModel } from '../../../../viewModels/admin/useTranslationServiceViewModel';
import { Card, CardContent, CardHeader } from '../../../ui';

export default function TranslationServiceView() {
  const colors = useThemeColors();
  const {
    healthData,
    cacheStats,
    testHistory,
    isLoading,
    isRefreshing,
    isTestingTranslation,
    isClearingCache,
    error,
    autoRefresh,
    toggleAutoRefresh,
    lastChecked,
    refreshHealth,
    clearCache,
    testTranslation,
    clearTestHistory,
    formatUptime,
    getStatusColor,
  } = useTranslationServiceViewModel();

  const [testText, setTestText] = useState('');
  const [testDirection, setTestDirection] = useState<'ar-en' | 'en-ar'>('ar-en');

  // Handle test translation
  const handleTestTranslation = async () => {
    const text = testText.trim() || (testDirection === 'ar-en' ? 'مرحبا' : 'Hello');
    const targetLang = testDirection === 'ar-en' ? 'English' : 'Arabic';

    const result = await testTranslation(text, targetLang);
    if (!result.success) {
      Alert.alert('Translation Error', result.error || 'Failed to translate');
    }
  };

  // Handle clear cache
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the translation cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const result = await clearCache();
            if (result.success) {
              Alert.alert('Success', 'Cache cleared successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to clear cache');
            }
          },
        },
      ],
    );
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusColor = getStatusColor(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
        {status.toLowerCase() === 'healthy' ? (
          <CheckCircle size={16} color={statusColor} />
        ) : status.toLowerCase() === 'loading' ? (
          <Loader2 size={16} color={statusColor} />
        ) : (
          <XCircle size={16} color={statusColor} />
        )}
        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  // Render loading state
  if (isLoading && !healthData) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Loader2 size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking translation service...
        </Text>
      </View>
    );
  }

  // Render error state
  if (error && !healthData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorState}>
          <AlertCircle size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Service Unavailable
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={refreshHealth}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshHealth}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Service Status Card */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Languages size={24} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Service Status
            </Text>
            {healthData && renderStatusBadge(healthData.status)}
          </View>
        </CardHeader>
        <CardContent>
          {healthData && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Uptime
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatUptime(healthData.uptime_seconds)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Cache Size
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {healthData.cache_size} items
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Last Checked
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {lastChecked?.toLocaleTimeString() || 'Never'}
                </Text>
              </View>
            </>
          )}

          {/* Auto-refresh toggle */}
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              Auto-refresh (30s)
            </Text>
            <Switch
              value={autoRefresh}
              onValueChange={toggleAutoRefresh}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={autoRefresh ? colors.primary : colors.textSecondary}
            />
          </View>
        </CardContent>
      </Card>

      {/* Models Status Card */}
      {healthData?.models_loaded && (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <CardHeader>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Model Status
            </Text>
          </CardHeader>
          <CardContent>
            <View style={styles.modelRow}>
              <View style={styles.modelInfo}>
                <Text style={[styles.modelName, { color: colors.text }]}>
                  Arabic → English
                </Text>
                <Text style={[styles.modelSubtext, { color: colors.textSecondary }]}>
                  {healthData.models_loaded.model_ar_en || 'Default model'}
                </Text>
              </View>
              {healthData.models_loaded.transformers_ar_en_loaded ? (
                <CheckCircle size={20} color={colors.success} />
              ) : (
                <XCircle size={20} color={colors.error} />
              )}
            </View>
            <View style={styles.modelRow}>
              <View style={styles.modelInfo}>
                <Text style={[styles.modelName, { color: colors.text }]}>
                  English → Arabic
                </Text>
                <Text style={[styles.modelSubtext, { color: colors.textSecondary }]}>
                  {healthData.models_loaded.model_en_ar || 'Default model'}
                </Text>
              </View>
              {healthData.models_loaded.transformers_en_ar_loaded ? (
                <CheckCircle size={20} color={colors.success} />
              ) : (
                <XCircle size={20} color={colors.error} />
              )}
            </View>
            {healthData.models_loaded.load_time_seconds && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Load Time
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {healthData.models_loaded.load_time_seconds.toFixed(2)}s
                </Text>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cache Stats Card */}
      {cacheStats && (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <Database size={24} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Cache Statistics
              </Text>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {cacheStats.cache_size}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Entries
                </Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {cacheStats.hits}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Hits
                </Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {cacheStats.misses}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Misses
                </Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {(cacheStats.hit_rate * 100).toFixed(1)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Hit Rate
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.clearCacheButton, { backgroundColor: colors.error + '20' }]}
              onPress={handleClearCache}
              disabled={isClearingCache}
            >
              {isClearingCache ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Trash2 size={18} color={colors.error} />
                  <Text style={[styles.clearCacheText, { color: colors.error }]}>Clear Cache</Text>
                </>
              )}
            </TouchableOpacity>
          </CardContent>
        </Card>
      )}

      {/* Test Translation Card */}
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <CardHeader>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Test Translation
          </Text>
        </CardHeader>
        <CardContent>
          {/* Direction Toggle */}
          <View style={styles.directionToggle}>
            <TouchableOpacity
              style={[
                styles.directionButton,
                testDirection === 'ar-en' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTestDirection('ar-en')}
            >
              <Text
                style={[
                  styles.directionButtonText,
                  testDirection === 'ar-en' ? { color: colors.textInverse } : { color: colors.text },
                ]}
              >
                AR → EN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionButton,
                testDirection === 'en-ar' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTestDirection('en-ar')}
            >
              <Text
                style={[
                  styles.directionButtonText,
                  testDirection === 'en-ar' ? { color: colors.textInverse } : { color: colors.text },
                ]}
              >
                EN → AR
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input */}
          <TextInput
            style={[styles.testInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder={testDirection === 'ar-en' ? 'Enter Arabic text (default: مرحبا)' : 'Enter English text (default: Hello)'}
            placeholderTextColor={colors.textSecondary}
            value={testText}
            onChangeText={setTestText}
            multiline
          />

          {/* Test Button */}
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary }]}
            onPress={handleTestTranslation}
            disabled={isTestingTranslation}
          >
            {isTestingTranslation ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Play size={18} color={colors.textInverse} />
                <Text style={[styles.testButtonText, { color: colors.textInverse }]}>Test Translation</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Test History */}
          {testHistory.length > 0 && (
            <View style={styles.testHistorySection}>
              <View style={styles.testHistoryHeader}>
                <Text style={[styles.testHistoryTitle, { color: colors.text }]}>
                  Recent Tests
                </Text>
                <TouchableOpacity onPress={clearTestHistory}>
                  <Text style={[styles.clearHistoryText, { color: colors.primary }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
              {testHistory.slice(0, 5).map((test, index) => (
                <View key={index} style={[styles.testHistoryItem, { backgroundColor: colors.background }]}>
                  <View style={styles.testHistoryRow}>
                    <Text style={[styles.testHistoryText, { color: colors.textSecondary }]}>
                      {test.text}
                    </Text>
                    <Text style={[styles.testHistoryArrow, { color: colors.textSecondary }]}>
                      →
                    </Text>
                    <Text style={[styles.testHistoryResult, { color: test.error ? colors.error : colors.text }]}>
                      {test.error || test.translatedText || 'N/A'}
                    </Text>
                  </View>
                  {test.duration && (
                    <View style={styles.testHistoryMeta}>
                      <Clock size={12} color={colors.textSecondary} />
                      <Text style={[styles.testHistoryDuration, { color: colors.textSecondary }]}>
                        {test.duration}ms
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.base,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  card: {
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: spacing.md,
  },
  toggleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  modelSubtext: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  clearCacheText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  directionToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  directionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  directionButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  testInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  testButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  testHistorySection: {
    marginTop: spacing.lg,
  },
  testHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  testHistoryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  clearHistoryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  testHistoryItem: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  testHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  testHistoryText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  testHistoryArrow: {
    fontSize: typography.fontSize.sm,
  },
  testHistoryResult: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  testHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  testHistoryDuration: {
    fontSize: typography.fontSize.xs,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
