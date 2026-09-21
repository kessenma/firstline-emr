// apps/mobile/src/components/patient-chart/messaging/TelegramMessagingView.tsx
// Main view component for Telegram messaging — with offline state support

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { useOfflineSaveNotification } from '../../../hooks/useConnectionToasts';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { TelegramHeader } from './components/TelegramHeader';
import { MessageList } from './components/MessageList';
import { TelegramMessageInput } from './components/TelegramMessageInput';
import { TranslationModelMiniSheet } from './components/TranslationModelMiniSheet';
import type { TelegramMessagesViewModel } from './utils/telegramTypes';

interface TelegramMessagingViewProps extends TelegramMessagesViewModel {
  patientName: string;
  patientId: string;
  isOffline?: boolean;
  queuedCount?: number;
  isOfflineTranslation?: boolean;
  sendTranslatedMessage?: (translatedText: string, originalText: string) => Promise<void>;
  translateForSend?: (text: string) => Promise<string>;
  isLanguageMismatch?: boolean;
}

export const TelegramMessagingView: React.FC<TelegramMessagingViewProps> = ({
  // Patient info
  patientName,
  patientId: _patientId,

  // Messages
  messages,
  isLoadingMessages,
  loadMessages: _loadMessages,

  // Sending
  newMessage,
  setNewMessage,
  sendMessage,
  sendImage,
  sendAudio,
  isSending,

  // Error
  error,
  retry,

  // Translation
  translateMessages,
  isTranslating,
  toggleTranslation,

  // Real-time
  isConnected,

  // Thread Info
  threadInfo,

  // Refresh
  refresh,

  // Offline
  isOffline = false,
  queuedCount = 0,
  isOfflineTranslation = false,

  // Send-time translation
  sendTranslatedMessage,
  translateForSend,
  isLanguageMismatch = false,
}) => {
  const colors = useThemeColors();
  const { notifyOfflineSave } = useOfflineSaveNotification();
  const [refreshing, setRefreshing] = useState(false);
  const [showModelSheet, setShowModelSheet] = useState(false);

  const [isTranslatingForSend, setIsTranslatingForSend] = useState(false);

  // Handle pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Handle send with mismatch check — shows Alert if English→Arabic mismatch
  const handleSendWithMismatchCheck = () => {
    if (!isLanguageMismatch || !translateForSend || !sendTranslatedMessage) {
      sendMessage();
      if (isOffline) notifyOfflineSave();
      return;
    }

    Alert.alert(
      'Translate to Arabic?',
      "You're about to respond in English to an Arabic-speaking patient. Would you like to translate your message before sending?",
      [
        {
          text: 'Translate & Review',
          onPress: async () => {
            setIsTranslatingForSend(true);
            try {
              const translated = await translateForSend(newMessage.trim());
              setIsTranslatingForSend(false);
              // Show preview
              Alert.alert(
                'Translation Preview',
                `Original (EN):\n${newMessage.trim()}\n\nTranslated (AR):\n${translated}`,
                [
                  {
                    text: 'Send Translation',
                    onPress: () => {
                      sendTranslatedMessage(translated, newMessage.trim());
                      if (isOffline) notifyOfflineSave();
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
              );
            } catch {
              setIsTranslatingForSend(false);
              Alert.alert('Translation Failed', 'Could not translate the message. You can still send it in English.');
            }
          },
        },
        {
          text: 'Send in English',
          onPress: () => {
            sendMessage();
            if (isOffline) notifyOfflineSave();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // One-click translate + send (no preview)
  const handleTranslateAndSend = async () => {
    if (!translateForSend || !sendTranslatedMessage || !newMessage.trim()) return;
    setIsTranslatingForSend(true);
    try {
      const translated = await translateForSend(newMessage.trim());
      await sendTranslatedMessage(translated, newMessage.trim());
      if (isOffline) notifyOfflineSave();
    } catch {
      Alert.alert('Translation Failed', 'Could not translate the message.');
    } finally {
      setIsTranslatingForSend(false);
    }
  };

  // Handle translate all
  const handleTranslateAll = async () => {
    const result = await translateMessages();
    if (result.translatedCount > 0) {
      Alert.alert(
        'Translation Complete',
        `Translated ${result.translatedCount} message${result.translatedCount > 1 ? 's' : ''}`,
      );
    } else {
      Alert.alert(
        'No Messages to Translate',
        'All messages are already translated or no Arabic text was found.',
      );
    }
  };

  // Handle settings
  const handleOpenSettings = () => {
    Alert.alert('Settings', 'Choose an action', [
      {
        text: 'Translate All Messages',
        onPress: handleTranslateAll,
      },
      {
        text: 'View Participants',
        onPress: () => {
          const participants = threadInfo?.participants || [];
          const names = participants
            .map(p => `${p.firstName} ${p.lastName}`)
            .join('\n');
          Alert.alert(
            'Thread Participants',
            names || 'No participants found',
          );
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  // Error state
  if (error && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Failed to Load Messages
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={retry}
          >
            <RefreshCw size={18} color={colors.textInverse} />
            <Text
              style={[styles.retryButtonText, { color: colors.textInverse }]}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <TelegramHeader
        patientName={patientName}
        isConnected={isConnected}
        threadInfo={threadInfo}
        onOpenSettings={handleOpenSettings}
        onTranslateAll={handleTranslateAll}
        isTranslating={isTranslating}
        onOpenTranslationInfo={() => setShowModelSheet(true)}
        isOfflineTranslation={isOfflineTranslation}
      />

      {/* Offline Banner */}
      {isOffline && (
        <View
          style={[
            styles.offlineBanner,
            { backgroundColor: colors.warning + '30' },
          ]}
        >
          <Text style={[styles.offlineBannerText, { color: colors.text }]}>
            You are offline
            {queuedCount > 0
              ? ` — ${queuedCount} item${queuedCount !== 1 ? 's' : ''} queued`
              : ''}
          </Text>
          <Text
            style={[
              styles.offlineBannerSubtext,
              { color: colors.textSecondary },
            ]}
          >
            Messages and media will be sent when you reconnect
          </Text>
        </View>
      )}

      {/* Message List */}
      <MessageList
        messages={messages}
        isLoading={isLoadingMessages}
        onToggleTranslation={toggleTranslation}
        threadInfo={threadInfo}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Error banner (if error but has messages) */}
      {error && messages.length > 0 && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error }]}>
          <Text
            style={[styles.errorBannerText, { color: colors.textInverse }]}
          >
            {error}
          </Text>
          <TouchableOpacity onPress={retry}>
            <RefreshCw size={16} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <TelegramMessageInput
        value={newMessage}
        onChangeText={setNewMessage}
        onSendText={handleSendWithMismatchCheck}
        onSendImage={sendImage}
        onSendAudio={sendAudio}
        onTranslateAndSend={handleTranslateAndSend}
        showTranslateButton={isLanguageMismatch}
        sending={isSending || isTranslatingForSend}
        disabled={false}
        placeholder={
          isOffline
            ? 'Type a message (will send when online)...'
            : undefined
        }
      />
      {/* Translation model download sheet */}
      <TranslationModelMiniSheet
        visible={showModelSheet}
        onClose={() => setShowModelSheet(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  offlineBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  offlineBannerSubtext: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
});

export default TelegramMessagingView;
