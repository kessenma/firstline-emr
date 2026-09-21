// apps/mobile/src/components/patient-chart/video-call/VideoCallContainer.tsx
//
// Section entry point, used by both the tabs view and the dashboard sheet.

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { usePatientChart } from '../PatientChartContext';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography } from '../../../utils/theme';
import { VideoCallView } from './VideoCallView';

export const VideoCallContainer: React.FC = () => {
  const colors = useThemeColors();
  const { patientInfo, loadingPatientInfo } = usePatientChart();

  if (loadingPatientInfo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!patientInfo?.id) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Patient not loaded.
        </Text>
      </View>
    );
  }

  return <VideoCallView />;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
    minHeight: 160,
  },
  message: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
});

export default VideoCallContainer;
