// apps/mobile/src/components/patient-chart/messaging/TelegramMessagingContainer.tsx
// Container component that connects to PatientChartContext

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography } from '../../../utils/theme';
import { usePatientChart } from '../PatientChartContext';
import { useTelegramMessagesViewModel } from './hooks/useTelegramMessagesViewModel';
import { TelegramMessagingView } from './TelegramMessagingView';
import { TelegramLinkCode } from './TelegramLinkCode';

export const TelegramMessagingContainer: React.FC = () => {
  const colors = useThemeColors();
  const { patientInfo, loadingPatientInfo } = usePatientChart();

  // Extract telegram chat ID from patient info
  const telegramChatId = patientInfo?.telegramChatId || '';
  const patientId = patientInfo?.patientID || '';
  const patientName = patientInfo?.patientName || 'Unknown Patient';

  // Initialize the ViewModel
  const viewModel = useTelegramMessagesViewModel({
    telegramChatId,
    patientId,
    enabled: !!telegramChatId,
    languageUsed: patientInfo?.language,
  });

  // Loading state
  if (loadingPatientInfo) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading patient info...
        </Text>
      </View>
    );
  }

  // No telegram chat ID — show link code generator
  if (!telegramChatId) {
    return (
      <TelegramLinkCode
        patientId={patientId}
        patientName={patientName}
        patientLanguage={patientInfo?.language}
      />
    );
  }

  return (
    <TelegramMessagingView
      patientName={patientName}
      patientId={patientId}
      {...viewModel}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
});

export default TelegramMessagingContainer;
