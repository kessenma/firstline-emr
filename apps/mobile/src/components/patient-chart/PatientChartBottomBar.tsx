// apps/mobile/src/components/patient-chart/PatientChartBottomBar.tsx
// Bottom action bar for patient chart: back, view toggle, care team, send, refresh.

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  GalleryHorizontalEnd,
  Rows3,
  Users,
  Send,
  RefreshCw,
} from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useDeviceType } from '../../hooks/useDeviceType';
import type { PatientChartViewMode } from '../../hooks/usePatientChartViewPreference';

export interface PatientChartBottomBarProps {
  chartView: PatientChartViewMode;
  onToggleView: () => void;
  onCareTeamPress: () => void;
  careTeamCount: number;
  hasCareTeamConflict: boolean;
  onSendPress: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  disabled: boolean;
  onBack?: () => void;
}

const BarButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onPress, disabled, children }) => {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => {
        translateY.value = withTiming(-2, { duration: 100 });
      }}
      onPressOut={() => {
        translateY.value = withTiming(0, { duration: 150 });
      }}
      disabled={disabled}
      style={styles.button}
      activeOpacity={0.8}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

export const PatientChartBottomBar: React.FC<PatientChartBottomBarProps> = ({
  chartView,
  onToggleView,
  onCareTeamPress,
  careTeamCount,
  hasCareTeamConflict,
  onSendPress,
  onRefresh,
  isRefreshing,
  disabled,
  onBack,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useDeviceType();
  const iconSize = isTablet ? 24 : 22;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={[styles.row, isTablet && styles.rowTablet]}>
        {onBack && (
          <BarButton onPress={onBack}>
            <View style={styles.labeledButton}>
              <ChevronLeft size={iconSize} color={colors.textSecondary} />
              {isTablet && <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Back</Text>}
            </View>
          </BarButton>
        )}

        <BarButton onPress={onRefresh} disabled={isRefreshing}>
          <View style={styles.labeledButton}>
            <RefreshCw
              size={iconSize}
              color={isRefreshing ? colors.primary : colors.textSecondary}
            />
            {isTablet && <Text style={[styles.buttonLabel, { color: isRefreshing ? colors.primary : colors.textSecondary }]}>Refresh</Text>}
          </View>
        </BarButton>

        <BarButton onPress={onToggleView}>
          <View style={styles.labeledButton}>
            {chartView === 'tabs' ? (
              <GalleryHorizontalEnd size={iconSize} color={colors.primary} />
            ) : (
              <Rows3 size={iconSize} color={colors.primary} />
            )}
            {isTablet && <Text style={[styles.buttonLabel, { color: colors.primary }]}>View</Text>}
          </View>
        </BarButton>

        <BarButton onPress={onCareTeamPress} disabled={disabled}>
          <View style={styles.labeledButton}>
            <View style={styles.iconWrapper}>
              <Users
                size={iconSize}
                color={
                  hasCareTeamConflict ? colors.warning : colors.textSecondary
                }
              />
              {careTeamCount > 0 && !hasCareTeamConflict && (
                <View
                  style={[styles.dot, { backgroundColor: colors.primary }]}
                />
              )}
              {hasCareTeamConflict && (
                <View style={[styles.dot, styles.conflictDot, { backgroundColor: colors.warning }]} />
              )}
            </View>
            {isTablet && <Text style={[styles.buttonLabel, { color: hasCareTeamConflict ? colors.warning : colors.textSecondary }]}>Team</Text>}
          </View>
        </BarButton>

        <BarButton onPress={onSendPress} disabled={disabled}>
          <View style={styles.labeledButton}>
            <Send size={iconSize} color={colors.textSecondary} />
            {isTablet && <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Send</Text>}
          </View>
        </BarButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rowTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 36,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labeledButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  buttonLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  iconWrapper: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  conflictDot: {},
});
