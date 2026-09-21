// apps/mobile/src/screens/messages/MessagesScreenView.tsx
// View component for messages screen - handles UI rendering with animated transitions

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { SquarePen, Users, MessageCircle } from 'lucide-react-native';
import { Thread } from '../../types/messages';
import { ErrorCard } from '../../components/ErrorCard';
import { useMessagesViewModel } from './useMessagesViewModel';
import { ThreadDetailScreenView } from './threads/ThreadDetailScreenView';
import { ComposeMessageModal } from '../../components/messages';
import { CallLauncher } from '../../components/calls';

type MessageTab = 'staff' | 'patient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MessagesScreenViewProps {
  userId: string;
  openThreadId?: string;
}

export const MessagesScreenView: React.FC<MessagesScreenViewProps> = ({
  userId,
  openThreadId,
}) => {
  const colors = useThemeColors();
  const { hideTabBar, showTabBar } = useTabBarVisibility();
  const viewModel = useMessagesViewModel();
  const [activeTab, setActiveTab] = useState<MessageTab>('staff');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [consumedOpenThreadId, setConsumedOpenThreadId] = useState<string | null>(
    null,
  );

  // Animation values for screen transitions
  const listTranslateX = useSharedValue(0);
  const detailTranslateX = useSharedValue(SCREEN_WIDTH);
  const listOpacity = useSharedValue(1);

  const {
    groupThreads,
    telegramThreads,
    selectedThread,
    loading,
    refreshing,
    error,
    handleThreadPress,
    handleBackFromThread,
    onRefresh,
    refresh,
    getThreadDisplayName,
    getThreadLastMessage,
    hasUnreadMessages,
  } = viewModel;

  // Custom thread press handler with animation
  const handleThreadPressWithAnimation = React.useCallback((thread: Thread) => {
    // Hide tab bar when entering thread detail
    hideTabBar();

    // Animate list out to the left
    listTranslateX.value = withTiming(-SCREEN_WIDTH * 0.3, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    listOpacity.value = withTiming(0.3, { duration: 300 });

    // Animate detail in from the right
    detailTranslateX.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    handleThreadPress(thread);
  }, [detailTranslateX, handleThreadPress, hideTabBar, listOpacity, listTranslateX]);

  // Custom back handler with animation
  const handleBackWithAnimation = () => {
    // Show tab bar when leaving thread detail
    showTabBar();

    // Animate detail out to the right
    detailTranslateX.value = withTiming(SCREEN_WIDTH, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    // Animate list back in
    listTranslateX.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    listOpacity.value = withTiming(1, { duration: 300 });

    // Delay the state update to allow animation to complete
    setTimeout(() => {
      handleBackFromThread();
    }, 100);
  };

  React.useEffect(() => {
    if (!openThreadId) return;
    if (consumedOpenThreadId === openThreadId) return;
    if (selectedThread) return;

    const targetThread = groupThreads.find(
      (thread: Thread) =>
        String(thread.id || '') === String(openThreadId) ||
        String(thread.slug || '') === String(openThreadId),
    );
    if (!targetThread) return;

    setActiveTab('staff');
    handleThreadPressWithAnimation(targetThread);
    setConsumedOpenThreadId(openThreadId);
  }, [
    consumedOpenThreadId,
    groupThreads,
    handleThreadPressWithAnimation,
    openThreadId,
    selectedThread,
  ]);

  // Handle thread created from compose modal
  const handleThreadCreated = (thread: Thread) => {
    // Navigate to the new thread
    handleThreadPressWithAnimation(thread);
    // Refresh the list to include the new thread
    refresh();
  };

  // Animated styles
  const listAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: listTranslateX.value }],
    opacity: listOpacity.value,
  }));

  const detailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: detailTranslateX.value }],
  }));

  const renderThreadItem = (thread: Thread, index: number) => {
    const displayName = getThreadDisplayName(thread);
    const lastMessage = getThreadLastMessage(thread);
    const hasUnread = hasUnreadMessages(thread);

    return (
      <TouchableOpacity
        key={thread.id || index}
        style={[
          styles.threadItem,
          {
            backgroundColor: hasUnread ? colors.primary + '10' : colors.surface,
            borderColor: hasUnread ? colors.primary + '30' : colors.border,
          },
        ]}
        onPress={() => handleThreadPressWithAnimation(thread)}
        activeOpacity={0.7}
      >
        <View style={styles.threadHeader}>
          <View style={styles.threadTitleContainer}>
            <Text
              style={[styles.threadTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {thread.type === 'internal' && (
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  style={[styles.typeBadgeText, { color: colors.textInverse }]}
                >
                  Group
                </Text>
              </View>
            )}
          </View>
          {hasUnread && (
            <View
              style={[styles.unreadBadge, { backgroundColor: colors.error }]}
            >
              <Text
                style={[styles.unreadBadgeText, { color: colors.textInverse }]}
              >
                {thread.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.lastMessage, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {lastMessage}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMessagesList = () => {
    if (error) {
      return (
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: colors.background },
          ]}
          edges={['top']}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Messages
            </Text>
          </View>
          <ErrorCard
            error={error}
            onRetry={refresh}
            title="Failed to Load Messages"
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        edges={['top']}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Messages
          </Text>
        </View>

        {/* Tab Bar */}
        <View
          style={[
            styles.tabBar,
            {
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'staff' && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('staff')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'staff' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'staff' ? '600' : '400',
                },
              ]}
            >
              Staff
            </Text>
            {groupThreads.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'staff' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                <Text style={[styles.tabBadgeText, { color: colors.textInverse }]}>
                  {groupThreads.reduce(
                    (sum: number, t: Thread) => sum + (t.unreadCount || 0),
                    0,
                  ) || groupThreads.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'patient' && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('patient')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'patient' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'patient' ? '600' : '400',
                },
              ]}
            >
              Patient
            </Text>
            {telegramThreads.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'patient' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                <Text style={[styles.tabBadgeText, { color: colors.textInverse }]}>
                  {telegramThreads.reduce(
                    (sum: number, t: Thread) => sum + (t.unreadCount || 0),
                    0,
                  ) || telegramThreads.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Loading messages...
              </Text>
            </View>
          ) : (
            <>
              {/* Staff Tab Content */}
              {activeTab === 'staff' && (
                <>
                  {/* New Message + Call */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.newMessageButton,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => setComposeModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <SquarePen size={18} color={colors.textInverse} />
                      <Text
                        style={[styles.newMessageText, { color: colors.textInverse }]}
                      >
                        New Message
                      </Text>
                    </TouchableOpacity>

                    <CallLauncher style={styles.callButton} />
                  </View>

                  {/* Staff Threads */}
                  {groupThreads.length > 0 ? (
                    <View style={styles.section}>
                      {groupThreads.map((thread: Thread, index: number) =>
                        renderThreadItem(thread, index),
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Users size={64} color={colors.textSecondary} style={styles.emptyStateIcon} />
                      <Text
                        style={[styles.emptyStateTitle, { color: colors.text }]}
                      >
                        No staff messages yet
                      </Text>
                      <Text
                        style={[
                          styles.emptyStateSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Staff conversations will appear here
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Patient Tab Content */}
              {activeTab === 'patient' && (
                <>
                  {telegramThreads.length > 0 ? (
                    <View style={styles.section}>
                      {telegramThreads.map((thread: Thread, index: number) =>
                        renderThreadItem(thread, index),
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <MessageCircle size={64} color={colors.textSecondary} style={styles.emptyStateIcon} />
                      <Text
                        style={[styles.emptyStateTitle, { color: colors.text }]}
                      >
                        No patient messages yet
                      </Text>
                      <Text
                        style={[
                          styles.emptyStateSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Patient conversations will appear here
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  };

  return (
    <View
      style={[
        styles.screenContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      {/* Messages List - Always mounted, animated */}
      <Animated.View style={[styles.screen, listAnimatedStyle]}>
        {renderMessagesList()}
      </Animated.View>

      {/* Thread Detail - Always mounted when selected, animated */}
      {selectedThread && (
        <Animated.View
          style={[styles.screen, styles.detailScreen, detailAnimatedStyle]}
        >
          <ThreadDetailScreenView
            thread={selectedThread}
            currentUserId={userId}
            onBack={handleBackWithAnimation}
          />
        </Animated.View>
      )}

      {/* Compose Message Modal */}
      <ComposeMessageModal
        visible={composeModalVisible}
        onClose={() => setComposeModalVisible(false)}
        onThreadCreated={handleThreadCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    position: 'relative',
    // backgroundColor set dynamically via colors.backgroundSecondary
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
  detailScreen: {
    zIndex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tabText: {
    fontSize: typography.fontSize.base,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  tabBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    gap: spacing.sm,
  },
  newMessageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  callButton: {
    width: 52,
  },
  newMessageIcon: {
    fontSize: 18,
  },
  newMessageText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.massive,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
    marginHorizontal: spacing.base,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  threadItem: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  threadTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  threadTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
  },
  unreadBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  lastMessage: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.massive,
    paddingHorizontal: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.base,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
});

export default MessagesScreenView;
