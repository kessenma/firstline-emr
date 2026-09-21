// Voice Dictation bottom sheet — tab container with 3 modes.
// Guided | Hands-Free | Smart

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { CircleHelp } from 'lucide-react-native';
import { BottomSheet } from '../../../BottomSheet';
import { AccordionItem } from '../../../ui/Accordion';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import {
  isVoiceLLMModelDownloaded,
} from '../../../../hooks/useVoiceDictationModels';
import { FeatureFlags } from '../../../../config/featureFlags';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { GuidedDictationView } from './GuidedDictationView';
import { HandsFreeDictationView } from './HandsFreeDictationView';
import { SmartDictationView } from './SmartDictationView';
import type { DictationResult } from './useVoiceDictation';

type TabKey = 'guided' | 'handsfree' | 'smart';

interface Tab {
  key: TabKey;
  label: string;
  available: boolean;
}

interface VoiceDictationSheetProps {
  visible: boolean;
  onClose: () => void;
  onFieldsReady: (fields: DictationResult) => void;
  onSaveDraft?: (fields: DictationResult) => void;
  /** Publish note directly without opening NoteCreationSheet */
  onPublish?: (fields: DictationResult) => void;
  /** Pre-fill fields with existing content (e.g. from a draft note) */
  initialContent?: DictationResult;
}

export const VoiceDictationSheet: React.FC<VoiceDictationSheetProps> = ({
  visible,
  onClose,
  onFieldsReady,
  onSaveDraft,
  onPublish,
  initialContent,
}) => {
  const colors = useThemeColors();
  const [showInfo, setShowInfo] = useState(false);

  // Native STT is always available (no model download needed)
  const llmReady =
    FeatureFlags.VOICE_DICTATION_LLM && isVoiceLLMModelDownloaded();

  const tabs: Tab[] = [
    { key: 'guided', label: 'Guided', available: true },
    { key: 'handsfree', label: 'Hands-Free', available: true },
    ...(llmReady
      ? [{ key: 'smart' as TabKey, label: 'Smart', available: true }]
      : []),
  ];

  const [activeTab, setActiveTab] = useState<TabKey>('guided');

  // Reset to guided tab when not visible
  const handleClose = () => {
    onClose();
    setActiveTab('guided');
    setShowInfo(false);
  };

  const handleFieldsReady = (fields: DictationResult) => {
    onFieldsReady(fields);
    handleClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Voice Dictation"
      snapPoint={95}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.container}>
        {/* Header row with tabs + info button */}
        <View style={styles.headerRow}>
          {/* Tabs */}
          <View
            style={[styles.tabBar, { borderColor: colors.border }]}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
                disabled={!tab.available}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab.key ? '#fff' : colors.text,
                      opacity: tab.available ? 1 : 0.4,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info button */}
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowInfo(!showInfo)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CircleHelp
              size={22}
              color={showInfo ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Info accordion */}
        {showInfo && (
          <View
            style={[
              styles.infoContainer,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
          >
            <AccordionItem
              title="Guided"
              headerStyle={styles.infoHeader}
              contentStyle={styles.infoContent}
            >
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Record each note field individually. Tap the mic next to a field
                to dictate, then review and edit. Best for post-surgery
                note-taking.
              </Text>
            </AccordionItem>
            <AccordionItem
              title="Hands-Free"
              headerStyle={styles.infoHeader}
              contentStyle={styles.infoContent}
            >
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Fully voice-guided flow. Tap Start once and the app walks you
                through each field with voice prompts. Best during surgery with
                gloves on. Uses your device's built-in speech recognition.
              </Text>
            </AccordionItem>
            {llmReady && (
              <AccordionItem
                title="Smart"
                headerStyle={styles.infoHeader}
                contentStyle={styles.infoContent}
              >
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  Record everything in one go, then AI extracts and fills fields
                  automatically. Requires the Smart Extraction model.
                </Text>
              </AccordionItem>
            )}
            <AccordionItem
              title="Voice Commands"
              headerStyle={styles.infoHeader}
              contentStyle={styles.infoContent}
            >
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                While recording, say these commands:{'\n\n'}
                <Text style={[styles.infoCommand, { color: colors.text }]}>"next" "done" "continue"</Text>
                {' '}— save current field and move to the next one{'\n\n'}
                <Text style={[styles.infoCommand, { color: colors.text }]}>"stop" "cancel"</Text>
                {' '}— pause recording on the current field{'\n\n'}
                <Text style={[styles.infoCommand, { color: colors.text }]}>"redo" "restart" "start over"</Text>
                {' '}— clear the current field and start recording again{'\n\n'}
                <Text style={[styles.infoCommand, { color: colors.text }]}>"save draft" "save note"</Text>
                {' '}— save all fields as a draft and exit
              </Text>
            </AccordionItem>
            <AccordionItem
              title="Tips"
              headerStyle={styles.infoHeader}
              contentStyle={styles.infoContent}
            >
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {'\u2022'} Speech recognition runs on-device — works offline{'\n'}
                {'\u2022'} Medical terms (ORIF, arthroplasty, etc.) are recognized automatically{'\n'}
                {'\u2022'} Tap any field card to switch to it while recording{'\n'}
                {'\u2022'} Use the Back/Next buttons to navigate between fields{'\n'}
                {'\u2022'} You can edit text manually after dictation
              </Text>
            </AccordionItem>
          </View>
        )}

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'guided' && (
            <GuidedDictationView
              onFieldsReady={handleFieldsReady}
              onSaveDraft={(fields) => {
                onSaveDraft?.(fields);
                handleClose();
              }}
              onPublish={onPublish ? (fields) => {
                onPublish(fields);
                handleClose();
              } : undefined}
              initialContent={initialContent}
            />
          )}
          {activeTab === 'handsfree' && (
            <HandsFreeDictationView onFieldsReady={handleFieldsReady} />
          )}
          {activeTab === 'smart' && (
            <SmartDictationView onFieldsReady={handleFieldsReady} />
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  infoButton: {
    padding: 4,
  },
  infoContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  infoHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  infoContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  infoCommand: {
    fontWeight: '700' as const,
    fontSize: typography.fontSize.sm,
  },
  tabContent: {
    flex: 1,
  },
});
