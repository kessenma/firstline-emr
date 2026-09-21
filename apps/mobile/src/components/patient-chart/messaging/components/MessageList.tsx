// apps/mobile/src/components/patient-chart/messaging/components/MessageList.tsx
// FlashList-based scrollable message list with inverted scroll

import React, { useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography } from '../../../../utils/theme';
import { MessageBubble } from './MessageBubble';
import type { TelegramMessage, TelegramThreadInfo } from '../utils/telegramTypes';

interface MessageListProps {
  messages: TelegramMessage[];
  isLoading: boolean;
  onToggleTranslation: (messageId: string) => void;
  threadInfo?: TelegramThreadInfo | null;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  onToggleTranslation,
  threadInfo: _threadInfo,
  onRefresh,
  refreshing,
}) => {
  const colors = useThemeColors();
  const listRef = useRef<FlatList<TelegramMessage>>(null);

  // Render individual message item
  const renderItem = useCallback(
    ({ item }: { item: TelegramMessage }) => (
      <MessageBubble
        message={item}
        onToggleTranslation={onToggleTranslation}
        showSenderName={!item.isSelf}
      />
    ),
    [onToggleTranslation]
  );

  // Key extractor
  const keyExtractor = useCallback((item: TelegramMessage) => item._id, []);

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading messages...
      </Text>
    </View>
  );

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MessageSquare size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Messages Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start the conversation with your patient
      </Text>
    </View>
  );

  // Show loading state
  if (isLoading && messages.length === 0) {
    return renderLoadingSkeleton();
  }

  // Show empty state
  if (!isLoading && messages.length === 0) {
    return renderEmptyState();
  }

  // Reversed messages for inverted FlatList
  // FlatList with inverted prop shows newest at bottom
  const reversedMessages = [...messages].reverse();

  return (
    <FlatList
      ref={listRef}
      data={reversedMessages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      inverted
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={
        isLoading ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: spacing.md,
  },
  separator: {
    height: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footerLoading: {
    padding: spacing.md,
    alignItems: 'center',
  },
});

export default MessageList;
