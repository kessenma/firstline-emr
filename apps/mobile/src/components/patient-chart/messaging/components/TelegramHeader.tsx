// apps/mobile/src/components/patient-chart/messaging/components/TelegramHeader.tsx
// Header component for telegram messaging view

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Settings, Globe, Wifi, WifiOff, Users, Download, Cpu } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { TelegramThreadInfo } from '../utils/telegramTypes';

interface TelegramHeaderProps {
  patientName: string;
  isConnected: boolean;
  threadInfo?: TelegramThreadInfo | null;
  onOpenSettings: () => void;
  onTranslateAll: () => void;
  isTranslating: boolean;
  onOpenTranslationInfo: () => void;
  isOfflineTranslation: boolean;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  patientName,
  isConnected,
  threadInfo,
  onOpenSettings,
  onTranslateAll,
  isTranslating,
  onOpenTranslationInfo,
  isOfflineTranslation,
}) => {
  const colors = useThemeColors();

  const participantsCount = threadInfo?.participants?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Left section - patient info */}
      <View style={styles.leftSection}>
        <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
          {patientName || 'Patient'}
        </Text>
        <View style={styles.statusRow}>
          {/* Connection status */}
          <View style={styles.statusIndicator}>
            {isConnected ? (
              <Wifi size={12} color={colors.success} />
            ) : (
              <WifiOff size={12} color={colors.textSecondary} />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isConnected ? colors.success : colors.textSecondary },
              ]}
            >
              {isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>

          {/* Participants count */}
          {participantsCount > 0 && (
            <View style={styles.participantsIndicator}>
              <Users size={12} color={colors.textSecondary} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {participantsCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right section - actions */}
      <View style={styles.rightSection}>
        {/* Translate button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={onTranslateAll}
          disabled={isTranslating}
        >
          <Globe
            size={18}
            color={isTranslating ? colors.textSecondary : colors.primary}
          />
        </TouchableOpacity>

        {/* Translation mode info/download button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={onOpenTranslationInfo}
        >
          {isOfflineTranslation ? (
            <Cpu size={16} color={colors.success} />
          ) : (
            <Download size={16} color={colors.warning} />
          )}
        </TouchableOpacity>

        {/* Settings button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={onOpenSettings}
        >
          <Settings size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  patientName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TelegramHeader;
