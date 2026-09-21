// apps/mobile/src/components/patient-chart/media-gallery/MediaGalleryView.tsx
// Top-level gallery: toggle between Patient Photos / Telegram Media

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Camera, MessageSquare, Wifi, Lock } from 'lucide-react-native';
import { Tooltip } from '../../ui/Tooltip';
import { useNetInfo } from '@react-native-community/netinfo';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { usePatientChart } from '../PatientChartContext';
import { usePatientDataNetworkMode } from '../../../hooks/usePatientDataNetworkMode';
import { PatientPhotosGalleryView } from './PatientPhotosGalleryView';
import { TelegramMediaGalleryView } from './TelegramMediaGalleryView';

type GallerySection = 'patient' | 'telegram';

interface MediaGalleryViewProps {
  insideBottomSheet?: boolean;
}

export const MediaGalleryView: React.FC<MediaGalleryViewProps> = ({ insideBottomSheet }) => {
  const colors = useThemeColors();
  const { patientInfo } = usePatientChart();
  const { wifiOnly } = usePatientDataNetworkMode();

  const netInfo = useNetInfo();
  const isOnWifi = netInfo.type === 'wifi';

  // Media caching is always enabled; effective = not paused by wifi-only on cellular
  const effectiveCacheEnabled = !wifiOnly || isOnWifi;

  const hasTelegram = !!patientInfo?.telegramChatId;
  const [section, setSection] = React.useState<GallerySection>('patient');

  // Passive info banner when wifi-only mode is active but user is on cellular
  const renderWifiPausedBanner = () => {
    if (!wifiOnly || isOnWifi) return null;

    return (
      <View style={[styles.wifiPausedBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Wifi size={16} color={colors.textSecondary} />
        <Text style={[styles.wifiPausedText, { color: colors.textSecondary }]}>
          Media downloads paused — WiFi only mode
        </Text>
      </View>
    );
  };

  // Section toggle — always visible; Telegram button grayed out with tooltip when no chat ID
  const renderSectionToggle = () => {
    return (
      <View style={[styles.sectionToggle, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.sectionButton,
            section === 'patient' && {
              backgroundColor: colors.primary + '15',
              borderColor: colors.primary,
              borderWidth: 1,
            },
          ]}
          onPress={() => setSection('patient')}
          activeOpacity={0.7}
        >
          <Camera
            size={16}
            color={section === 'patient' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.sectionText,
              { color: section === 'patient' ? colors.primary : colors.textSecondary },
              section === 'patient' && styles.sectionTextActive,
            ]}
          >
            Patient Media
          </Text>
        </TouchableOpacity>

        {hasTelegram ? (
          <TouchableOpacity
            style={[
              styles.sectionButton,
              section === 'telegram' && {
                backgroundColor: colors.primary + '15',
                borderColor: colors.primary,
                borderWidth: 1,
              },
            ]}
            onPress={() => setSection('telegram')}
            activeOpacity={0.7}
          >
            <MessageSquare
              size={16}
              color={section === 'telegram' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.sectionText,
                { color: section === 'telegram' ? colors.primary : colors.textSecondary },
                section === 'telegram' && styles.sectionTextActive,
              ]}
            >
              Telegram Media
            </Text>
          </TouchableOpacity>
        ) : (
          <Tooltip
            tooltipText="This patient does not have a Telegram ID"
            position="bottom"
            maxWidth={220}
            style={{ flex: 1 }}
          >
            <View style={[styles.sectionButton, { opacity: 0.4 }]}>
              <Lock size={14} color={colors.textTertiary} style={{ marginRight: 2 }} />
              <MessageSquare size={16} color={colors.textTertiary} />
              <Text style={[styles.sectionText, { color: colors.textTertiary }]}>
                Telegram Media
              </Text>
            </View>
          </Tooltip>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderWifiPausedBanner()}
      {renderSectionToggle()}

      {section === 'patient' || !hasTelegram ? (
        <PatientPhotosGalleryView mediaCacheEnabled={effectiveCacheEnabled} insideBottomSheet={insideBottomSheet} />
      ) : (
        <TelegramMediaGalleryView mediaCacheEnabled={effectiveCacheEnabled} insideBottomSheet={insideBottomSheet} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wifiPausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  wifiPausedText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
  },
  sectionToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  sectionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  sectionTextActive: {
    fontWeight: typography.fontWeight.semibold,
  },
});

export default MediaGalleryView;
