// apps/mobile/src/components/admin/sections/analytics/AnalyticsView.tsx
// View component for analytics dashboard section

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../../../utils/theme';
import { useAnalyticsViewModel } from '../../../../viewModels/admin/useAnalyticsViewModel';
import { BarChart3, ExternalLink, Copy, Info, TrendingUp, Users, Activity } from 'lucide-react-native';
import { Card, CardContent, Button } from '../../../ui';

export function AnalyticsView() {
  const colors = useThemeColors();
  const {
    analyticsUrl,
    isOpening,
    openAnalytics,
    copyUrlToClipboard,
  } = useAnalyticsViewModel();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Section */}
      <Card style={styles.section}>
        <CardContent>
          <View style={styles.headerIcon}>
            <BarChart3 size={48} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Analytics Dashboard
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            View comprehensive analytics and insights about system usage, user engagement, and performance metrics.
          </Text>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card style={styles.section}>
        <CardContent>
          <View style={styles.infoHeader}>
            <Info size={20} color={colors.info} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Login Information
            </Text>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Use your MedFlow account credentials (same login as the app) to access the analytics dashboard.
            </Text>
          </View>

          <View style={styles.urlContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Dashboard URL
            </Text>
            <View style={[styles.urlBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Text style={[styles.urlText, { color: colors.text }]} numberOfLines={1}>
                {analyticsUrl}
              </Text>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: colors.primary }]}
                onPress={copyUrlToClipboard}
              >
                <Copy size={16} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Features Section */}
      <Card style={styles.section}>
        <CardContent>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Available Metrics
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                <Users size={24} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  User Engagement
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Track active users, session duration, and user behavior patterns
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.success + '20' }]}>
                <TrendingUp size={24} color={colors.success} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Growth Metrics
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Monitor user growth, signup trends, and retention rates
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.info + '20' }]}>
                <Activity size={24} color={colors.info} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  System Performance
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  View system health, response times, and error rates
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary + '20' }]}>
                <BarChart3 size={24} color={colors.secondary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  Usage Patterns
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  Analyze feature usage, peak hours, and user workflows
                </Text>
              </View>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <Button
          onPress={openAnalytics}
          disabled={isOpening}
          style={styles.openButton}
        >
          <ExternalLink size={20} color={colors.textInverse} />
          <Text style={[styles.openButtonText, { color: colors.textInverse }]}>
            {isOpening ? 'Opening...' : 'Open Analytics Dashboard'}
          </Text>
        </Button>

        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          The analytics dashboard will open in your default browser
        </Text>
      </View>

      {/* Note Section */}
      <View style={[styles.noteSection, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.noteTitle, { color: colors.text }]}>
          Note
        </Text>
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          The analytics dashboard is optimized for desktop viewing. For the best experience, we recommend accessing it from a computer or tablet in landscape mode.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerIcon: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold as any,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
  },
  infoBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  urlContainer: {
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing.xs,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  urlText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  copyButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  featuresList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  actionContainer: {
    margin: spacing.md,
    alignItems: 'center',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    width: '100%',
  },
  openButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noteSection: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  noteTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing.xs,
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
});
