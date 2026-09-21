// apps/mobile/src/components/patient-chart/messaging/components/MessageBubble.tsx
// Individual message bubble component with avatar and alignment

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { Avatar } from '../../../ui/Avatar';
import { MessageRenderer } from './MessageRenderer';
import type { TelegramMessage } from '../utils/telegramTypes';

interface MessageBubbleProps {
  message: TelegramMessage;
  onToggleTranslation?: (messageId: string) => void;
  showSenderName?: boolean;
}

/** Extract staff name from "-- FirstName LastName" signature at end of message */
function parseStaffName(text: string | undefined): { firstName: string; lastName: string } | null {
  if (!text) return null;
  const match = text.match(/\n-- (.+)$/);
  if (!match) return null;
  const parts = match[1].trim().split(' ');
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  onToggleTranslation,
  showSenderName = true,
}) => {
  const colors = useThemeColors();
  const isSelf = message.isSelf;
  const staffName = isSelf ? parseStaffName(message.text) : null;

  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View
      style={[
        styles.container,
        isSelf ? styles.containerSelf : styles.containerOther,
      ]}
    >
      {/* Avatar on LEFT for patient messages */}
      {!isSelf && (
        <Avatar
          initials="P"
          size={32}
          style={{ backgroundColor: colors.primary }}
          textStyle={{ color: colors.textInverse }}
        />
      )}

      {/* Message bubble */}
      <View
        style={[
          styles.bubble,
          isSelf
            ? [styles.bubbleSelf, { backgroundColor: colors.primary }]
            : [styles.bubbleOther, { backgroundColor: colors.surface }],
        ]}
      >
        {/* Sender name */}
        {showSenderName && !isSelf && (
          <Text
            style={[
              styles.senderName,
              { color: colors.primary },
            ]}
            numberOfLines={1}
          >
            {message.sender}
          </Text>
        )}

        {/* Message content */}
        <MessageRenderer
          message={message}
          onToggleTranslation={onToggleTranslation}
          isSelf={isSelf}
        />

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            {
              color: isSelf
                ? 'rgba(255, 255, 255, 0.7)'
                : colors.textSecondary,
            },
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
      </View>

      {/* Avatar on RIGHT for staff messages */}
      {isSelf && (
        <Avatar
          user={staffName || undefined}
          initials={staffName ? undefined : (message.sender?.[0] || 'S')}
          size={32}
          style={{ backgroundColor: colors.secondary }}
          textStyle={{ color: colors.textInverse }}
        />
      )}
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  containerSelf: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    minWidth: 80,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleSelf: {
    borderBottomRightRadius: borderRadius.xs,
  },
  bubbleOther: {
    borderBottomLeftRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  senderName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
});

export default MessageBubble;
