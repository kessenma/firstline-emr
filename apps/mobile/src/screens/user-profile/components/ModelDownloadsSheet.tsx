// Unified bottom sheet for all AI model downloads (translation + voice dictation).

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Globe, Mic } from 'lucide-react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography } from '../../../utils/theme';
import { TranslationModelSection } from './TranslationModelSection';
import { VoiceDictationSection } from './VoiceDictationSection';
import { FeatureFlags } from '../../../config/featureFlags';

interface ModelDownloadsSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'translation' | 'voice';

export const ModelDownloadsSheet: React.FC<ModelDownloadsSheetProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();

  const showTranslation = FeatureFlags.OFFLINE_TRANSLATION;
  const showVoice = FeatureFlags.VOICE_DICTATION;

  // If only one feature is enabled, no need for tabs
  const showTabs = showTranslation && showVoice;
  const defaultTab: Tab = showTranslation ? 'translation' : 'voice';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="AI Model Downloads"
      snapPoint={80}
      showHandle={true}
      showCloseButton={true}
    >
      {showTabs && (
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'translation' && [
                styles.tabActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('translation')}
          >
            <Globe
              size={16}
              color={
                activeTab === 'translation'
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'translation'
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              Translation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'voice' && [
                styles.tabActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('voice')}
          >
            <Mic
              size={16}
              color={
                activeTab === 'voice' ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'voice'
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              Voice Dictation
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showTranslation && (
        <View
          style={
            showTabs && activeTab !== 'translation' ? styles.hidden : undefined
          }
        >
          <TranslationModelSection />
        </View>
      )}
      {showVoice && (
        <View
          style={showTabs && activeTab !== 'voice' ? styles.hidden : undefined}
        >
          <VoiceDictationSection />
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  hidden: {
    display: 'none',
  },
});

export default ModelDownloadsSheet;
