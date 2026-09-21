// apps/mobile/src/components/patient-chart/messaging/components/MessageRenderer.tsx
// Renders different message types: text, image, audio

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Globe } from 'lucide-react-native';
import { InlineAudioPlayer } from './InlineAudioPlayer';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { TelegramMessage } from '../utils/telegramTypes';

interface MessageRendererProps {
  message: TelegramMessage;
  onToggleTranslation?: (messageId: string) => void;
  isSelf?: boolean;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  onToggleTranslation,
  isSelf = false,
}) => {
  const colors = useThemeColors();
  const textColor = isSelf ? colors.textInverse : colors.text;

  // Detect if text contains Arabic characters
  const isArabic = (text: string): boolean => {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
  };

  // Self messages with originalMessage: toggle between Arabic (text) and English (originalMessage)
  // Received messages with translatedText: toggle between Arabic (text) and English (translatedText)
  const hasOriginal = !!(message.originalMessage && isSelf);
  const hasTranslation = !!(message.translatedText || message.isTranslated);

  let displayText = message.text;
  if (hasOriginal && message.showTranslated) {
    displayText = message.originalMessage!;
  } else if (!hasOriginal && message.showTranslated && message.translatedText) {
    displayText = message.translatedText;
  }

  const showTranslationToggle = hasOriginal || hasTranslation || isArabic(message.text);

  // Render text message
  const renderTextMessage = () => (
    <View>
      <Text style={[styles.messageText, { color: textColor }]}>
        {displayText}
      </Text>

      {/* Translation toggle */}
      {showTranslationToggle && onToggleTranslation && (
        <TouchableOpacity
          style={styles.translationToggle}
          onPress={() => onToggleTranslation(message._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Globe
            size={12}
            color={isSelf ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
          />
          <Text
            style={[
              styles.translationLabel,
              {
                color: isSelf ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
              },
            ]}
          >
            {hasOriginal
              ? (message.showTranslated ? 'AR' : 'EN')
              : (message.showTranslated ? 'Original' : 'Translate')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render image message
  const renderImageMessage = () => {
    const imageSource = message.signedUrl || message.mediaUrl;

    if (!imageSource) {
      return (
        <View style={styles.mediaPlaceholder}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Loading image...
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Image
          source={{ uri: imageSource }}
          style={styles.imageContent}
          resizeMode="cover"
        />
        {message.text && message.text !== 'Image' && (
          <Text style={[styles.imageCaption, { color: textColor }]}>
            {message.text}
          </Text>
        )}
      </View>
    );
  };

  // Render audio message
  const renderAudioMessage = () => {
    const audioUrl = message.signedUrl || message.mediaUrl;

    if (!audioUrl) {
      return (
        <View style={styles.mediaPlaceholder}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Loading audio...
          </Text>
        </View>
      );
    }

    return <InlineAudioPlayer audioUrl={audioUrl} isSelf={isSelf} />;
  };

  // Render based on message type
  switch (message.type) {
    case 'image':
      return renderImageMessage();
    case 'audio':
      return renderAudioMessage();
    case 'text':
    default:
      return renderTextMessage();
  }
};

const styles = StyleSheet.create({
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.4,
  },
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  translationLabel: {
    fontSize: typography.fontSize.xs,
  },
  imageContent: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
  },
  imageCaption: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  mediaPlaceholder: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: typography.fontSize.sm,
  },
});

export default MessageRenderer;
