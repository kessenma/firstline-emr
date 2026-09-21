// apps/mobile/src/components/admin/sections/statistics/StatisticsView.tsx
// Statistics view component with charts and metrics display
// Matches web version with Doctor/Patient Specialty Spread and Comparison views

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Download,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  TrendingUp,
  Calendar,
  FileText,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  Activity,
} from 'lucide-react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useStatisticsViewModel } from '../../../../viewModels/admin/useStatisticsViewModel';
import ErrorState from '../../shared/ErrorState';
import { LoadingState } from '../../shared/LoadingState';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.base * 4;

export function StatisticsView() {
  const colors = useThemeColors();
  const {
    userCounts,
    activityMetrics,
    lastUpdated,
    isLoading,
    isRefreshing,
    isExporting,
    error,
    refreshStatistics,
    exportData,
    clearError,
    topSpecialties,
    hasData,
    doctorSpecialties,
    patientSpecialties,
  } = useStatisticsViewModel();

  // Collapsible section states
  const [expandedSections, setExpandedSections] = useState({
    comparison: true,
    doctorSpread: false,
    patientSpread: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Chart configuration
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      labelColor: () => colors.text,
      style: {
        borderRadius: borderRadius.lg,
      },
      propsForLabels: {
        fontSize: 12,
      },
    }),
    [colors.surface, colors.text],
  );

  // Prepare user counts bar chart data
  const userCountsChartData = useMemo(() => {
    if (!userCounts) return null;

    return {
      labels: ['Existing', 'New', 'Denied', 'Admins'],
      datasets: [
        {
          data: [
            userCounts.existingUsers,
            userCounts.newSignups,
            userCounts.deniedUsers,
            userCounts.adminUsers,
          ],
        },
      ],
    };
  }, [userCounts]);

  // Prepare account type distribution data
  const accountTypeChartData = useMemo(() => {
    if (!userCounts) return null;

    return {
      labels: ['Doctors', 'Triage'],
      datasets: [
        {
          data: [
            userCounts.doctorCount,
            userCounts.triageCount,
          ],
        },
      ],
    };
  }, [userCounts]);

  // Prepare specialty pie chart data
  const specialtyPieChartData = useMemo(() => {
    if (topSpecialties.length === 0) return null;

    const chartColors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
    ];

    return topSpecialties.map((item, index) => ({
      name:
        item.specialty.length > 15
          ? item.specialty.substring(0, 15) + '...'
          : item.specialty,
      population: item.count,
      color: chartColors[index % chartColors.length],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  }, [topSpecialties, colors.text]);

  // Prepare doctor specialty bar chart data (top 10 for readability)
  const doctorSpecialtyChartData = useMemo(() => {
    const filteredSpecialties = doctorSpecialties
      .filter(item => item.count > 0)
      .slice(0, 10);

    if (filteredSpecialties.length === 0) return null;

    return {
      labels: filteredSpecialties.map(item =>
        item.specialty.length > 8
          ? item.specialty.substring(0, 8) + '...'
          : item.specialty
      ),
      datasets: [
        {
          data: filteredSpecialties.map(item => item.count),
        },
      ],
    };
  }, [doctorSpecialties]);

  // Prepare patient specialty bar chart data (top 10 for readability)
  const patientSpecialtyChartData = useMemo(() => {
    const filteredSpecialties = patientSpecialties
      .filter(item => item.count > 0)
      .slice(0, 10);

    if (filteredSpecialties.length === 0) return null;

    return {
      labels: filteredSpecialties.map(item =>
        item.specialty.length > 8
          ? item.specialty.substring(0, 8) + '...'
          : item.specialty
      ),
      datasets: [
        {
          data: filteredSpecialties.map(item => item.count),
        },
      ],
    };
  }, [patientSpecialties]);

  // Prepare comparison line chart data (merge doctor and patient specialties)
  const comparisonChartData = useMemo(() => {
    // Get all unique specialties from both doctors and patients
    const allSpecialties = new Set<string>();
    doctorSpecialties.forEach(item => allSpecialties.add(item.specialty));
    patientSpecialties.forEach(item => allSpecialties.add(item.specialty));

    // Convert to array and take top 8 by combined count for readability
    const specialtyArray = Array.from(allSpecialties);
    const mergedData = specialtyArray.map(specialty => {
      const doctorItem = doctorSpecialties.find(d => d.specialty === specialty);
      const patientItem = patientSpecialties.find(p => p.specialty === specialty);
      return {
        specialty,
        doctors: doctorItem?.count || 0,
        patients: patientItem?.count || 0,
        total: (doctorItem?.count || 0) + (patientItem?.count || 0),
      };
    });

    // Sort by total and take top 8
    const topMerged = mergedData
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    if (topMerged.length === 0) return null;

    return {
      labels: topMerged.map(item =>
        item.specialty.length > 6
          ? item.specialty.substring(0, 6) + '...'
          : item.specialty
      ),
      datasets: [
        {
          data: topMerged.map(item => item.doctors),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // blue for doctors
          strokeWidth: 2,
        },
        {
          data: topMerged.map(item => item.patients),
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green for patients
          strokeWidth: 2,
        },
      ],
      legend: ['Doctors', 'Patients'],
    };
  }, [doctorSpecialties, patientSpecialties]);

  // Loading state
  if (isLoading && !hasData) {
    return <LoadingState message="Loading statistics..." />;
  }

  // Error state
  if (error && !hasData) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          clearError();
          refreshStatistics();
        }}
      />
    );
  }

  // No data state
  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <PieChartIcon size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No statistics data available
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={refreshStatistics}
        >
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Load Statistics</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshStatistics}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header with last updated and export */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            {lastUpdated
              ? `Updated: ${lastUpdated.toLocaleString()}`
              : 'Not yet updated'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.exportButton,
            { backgroundColor: colors.primary },
            isExporting && styles.exportButtonDisabled,
          ]}
          onPress={exportData}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Download size={16} color={colors.textInverse} />
              <Text style={[styles.exportButtonText, { color: colors.textInverse }]}>Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard
          icon={Users}
          label="Total Users"
          value={userCounts?.totalUsers || 0}
          color={colors.primary}
          backgroundColor={colors.surface}
          textColor={colors.text}
          iconColor={colors.textInverse}
        />
        <SummaryCard
          icon={UserCheck}
          label="Existing"
          value={userCounts?.existingUsers || 0}
          color="#10B981"
          backgroundColor={colors.surface}
          textColor={colors.text}
          iconColor={colors.textInverse}
        />
        <SummaryCard
          icon={UserX}
          label="Denied"
          value={userCounts?.deniedUsers || 0}
          color="#EF4444"
          backgroundColor={colors.surface}
          textColor={colors.text}
          iconColor={colors.textInverse}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Admins"
          value={userCounts?.adminUsers || 0}
          color="#8B5CF6"
          backgroundColor={colors.surface}
          textColor={colors.text}
          iconColor={colors.textInverse}
        />
      </View>

      {/* User Counts Bar Chart */}
      {userCountsChartData && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              User Distribution
            </Text>
          </View>
          <BarChart
            data={userCountsChartData}
            width={CHART_WIDTH}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
          />
        </View>
      )}

      {/* Account Type Distribution */}
      {accountTypeChartData && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Account Type Distribution
            </Text>
          </View>
          <BarChart
            data={accountTypeChartData}
            width={CHART_WIDTH}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
          />
        </View>
      )}

      {/* Specialty Breakdown Pie Chart */}
      {specialtyPieChartData && specialtyPieChartData.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Top 5 Doctor Specialties
            </Text>
          </View>
          <PieChart
            data={specialtyPieChartData}
            width={CHART_WIDTH}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>
      )}

      {/* Specialty Spread Comparison (Collapsible) */}
      <CollapsibleSection
        title="Doctor vs Patient Specialty Comparison"
        subtitle="Comparison of available specialties"
        icon={Activity}
        isExpanded={expandedSections.comparison}
        onToggle={() => toggleSection('comparison')}
        colors={colors}
      >
        {comparisonChartData ? (
          <View>
            <LineChart
              data={comparisonChartData}
              width={CHART_WIDTH}
              height={280}
              chartConfig={{
                ...chartConfig,
                propsForLabels: {
                  fontSize: 10,
                },
              }}
              bezier
              style={styles.chart}
              withDots
              withShadow={false}
              fromZero
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Doctors</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendText, { color: colors.text }]}>Patients</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            No comparison data available
          </Text>
        )}
      </CollapsibleSection>

      {/* Doctor Specialty Spread (Collapsible) */}
      <CollapsibleSection
        title="Doctor Specialty Spread"
        subtitle="Distribution of doctor specialties"
        icon={Stethoscope}
        isExpanded={expandedSections.doctorSpread}
        onToggle={() => toggleSection('doctorSpread')}
        colors={colors}
      >
        {doctorSpecialtyChartData ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={doctorSpecialtyChartData}
                width={Math.max(CHART_WIDTH, doctorSpecialtyChartData.labels.length * 60)}
                height={250}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                verticalLabelRotation={45}
              />
            </ScrollView>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
              Showing top {doctorSpecialtyChartData.labels.length} specialties • Scroll horizontally for more
            </Text>
          </View>
        ) : (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            No doctor specialty data available
          </Text>
        )}
      </CollapsibleSection>

      {/* Patient Specialty Spread (Collapsible) */}
      <CollapsibleSection
        title="Patient Specialty Spread"
        subtitle="Distribution of patient specialties"
        icon={Users}
        isExpanded={expandedSections.patientSpread}
        onToggle={() => toggleSection('patientSpread')}
        colors={colors}
      >
        {patientSpecialtyChartData ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={patientSpecialtyChartData}
                width={Math.max(CHART_WIDTH, patientSpecialtyChartData.labels.length * 60)}
                height={250}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                verticalLabelRotation={45}
              />
            </ScrollView>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
              Showing top {patientSpecialtyChartData.labels.length} specialties • Scroll horizontally for more
            </Text>
          </View>
        ) : (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            No patient specialty data available
          </Text>
        )}
      </CollapsibleSection>

      {/* Activity Metrics */}
      {activityMetrics && (
        <View style={[styles.metricsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.metricsHeader}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={[styles.metricsTitle, { color: colors.text }]}>
              Activity Metrics
            </Text>
          </View>
          <View style={styles.metricsList}>
            <MetricRow
              icon={FileText}
              label="Medical Orders"
              value={activityMetrics.medicalOrdersCount}
              color={colors.primary}
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />
            <MetricRow
              icon={TrendingUp}
              label="Notifications Sent"
              value={activityMetrics.notificationsCount}
              color="#F59E0B"
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />
            <MetricRow
              icon={Users}
              label="Last Week Signups"
              value={activityMetrics.lastWeekSignups}
              color="#10B981"
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />
            <MetricRow
              icon={Users}
              label="Last Month Signups"
              value={activityMetrics.lastMonthSignups}
              color="#8B5CF6"
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />
          </View>
        </View>
      )}

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.surface }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Statistics are updated in real-time. Pull down to refresh or tap
          export to share this data.
        </Text>
      </View>
    </ScrollView>
  );
}

// Summary Card Component
interface SummaryCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
  textColor: string;
  iconColor?: string;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  backgroundColor,
  textColor,
  iconColor,
}: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { backgroundColor }]}>
      <View style={[styles.summaryIconContainer, { backgroundColor: color }]}>
        <Icon size={20} color={iconColor || '#fff'} />
      </View>
      <Text style={[styles.summaryValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// Metric Row Component
interface MetricRowProps {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  color: string;
  textColor: string;
  secondaryColor: string;
}

function MetricRow({
  icon: Icon,
  label,
  value,
  color,
  textColor,
  secondaryColor,
}: MetricRowProps) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLeft}>
        <Icon size={18} color={color} />
        <Text style={[styles.metricLabel, { color: secondaryColor }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

// Collapsible Section Component (like web accordion)
interface CollapsibleSectionProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  isExpanded: boolean;
  onToggle: () => void;
  colors: any;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  isExpanded,
  onToggle,
  colors,
  children,
}: CollapsibleSectionProps) {
  return (
    <View style={[styles.collapsibleCard, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.collapsibleHeaderLeft}>
          <Icon size={20} color={colors.primary} />
          <View style={styles.collapsibleTitleContainer}>
            <Text style={[styles.collapsibleTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.collapsibleSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronDown size={20} color={colors.textSecondary} />
        ) : (
          <ChevronRight size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lastUpdated: {
    fontSize: typography.fontSize.sm,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  exportButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    opacity: 0.7,
  },
  chartCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  chartHeader: {
    marginBottom: spacing.sm,
  },
  chartTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  chart: {
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  metricsCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  metricsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  metricsList: {
    gap: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabel: {
    fontSize: typography.fontSize.base,
  },
  metricValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  infoBanner: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  // Collapsible section styles
  collapsibleCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  collapsibleTitleContainer: {
    flex: 1,
  },
  collapsibleTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  collapsibleSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  collapsibleContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  // Legend styles for comparison chart
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: typography.fontSize.sm,
  },
  // Additional chart styles
  chartSubtitle: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noDataText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
