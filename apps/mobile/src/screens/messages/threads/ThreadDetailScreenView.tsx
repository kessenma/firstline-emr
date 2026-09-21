// apps/mobile/src/screens/messages/threads/ThreadDetailScreenView.tsx
// View component for thread detail screen - handles UI rendering

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { UserPlus, Users, LogOut, X, Search } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { Thread, Message } from '../../../types/messages';
import { ErrorCard } from '../../../components/ErrorCard';
import { InlineAudioPlayer } from '../../../components/patient-chart/messaging/components/InlineAudioPlayer';
import { MessageInput } from '../../../components/messages/MessageInput';
import { Avatar } from '../../../components/ui/Avatar';
import { PatientCardMessage } from '../../../components/messages/PatientCardMessage';
import { CallSummaryMessage } from '../../../components/messages/CallSummaryMessage';
import { PatientSearchModal } from '../../../components/messages/PatientSearchModal';
import { useThreadDetailViewModel } from './useThreadDetailViewModel';
import { usePowerSync } from '../../../hooks/powersync';
import { TABLES } from '../../../db';

interface ThreadDetailScreenViewProps {
  thread: Thread;
  currentUserId: string;
  onBack: () => void;
}

export const ThreadDetailScreenView: React.FC<ThreadDetailScreenViewProps> = ({
  thread,
  currentUserId,
  onBack,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { service: psService } = usePowerSync();
  const scrollViewRef = useRef<ScrollView>(null);
  const [patientSearchVisible, setPatientSearchVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [addParticipantModalVisible, setAddParticipantModalVisible] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSearchResults, setStaffSearchResults] = useState<any[]>([]);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  // Gesture handling for swipe-to-go-back
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 100; // Minimum swipe distance to trigger back

  const viewModel = useThreadDetailViewModel({
    thread,
    currentUserId,
  });

  const {
    messages,
    threadInfo,
    newMessage,
    loading,
    error,
    sending,
    isOffline,
    queuedCount,
    retry,
    setNewMessage,
    sendMessage,
    sendPatientCard,
    sendAudio,
    addParticipants,
    leaveThread,
    getParticipant,
    getDisplayName,
    getInitials,
    formatTime,
    getThreadTitle,
    isSystemGroup,
  } = viewModel;

  const handleSelectPatient = useCallback(
    (patient: any) => {
      sendPatientCard(patient);
    },
    [sendPatientCard],
  );

  // Search staff locally via PowerSync (all users are synced to SQLite)
  const searchStaff = useCallback(async (query: string) => {
    setStaffSearchQuery(query);
    if (query.trim().length < 2) {
      setStaffSearchResults([]);
      return;
    }

    setIsSearchingStaff(true);
    try {
      const searchTerm = `%${query.trim()}%`;
      const existingIds = threadInfo?.participants?.map(p => p.id) || [];
      // Build exclusion placeholders
      const excludePlaceholders = existingIds.length > 0
        ? `AND id NOT IN (${existingIds.map(() => '?').join(',')})`
        : '';

      const results = await psService.query<any>(
        `SELECT id, first_name, last_name, email, account_type, image, google_image
         FROM ${TABLES.USERS}
         WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
                OR (first_name || ' ' || last_name) LIKE ?)
         ${excludePlaceholders}
         ORDER BY first_name ASC
         LIMIT 20`,
        [searchTerm, searchTerm, searchTerm, searchTerm, ...existingIds],
      );

      setStaffSearchResults(results);
    } catch {
      // Silently fail search
    } finally {
      setIsSearchingStaff(false);
    }
  }, [threadInfo?.participants, psService]);

  const handleAddParticipant = useCallback(async (userId: string) => {
    setIsAddingParticipant(true);
    try {
      await addParticipants([userId]);
      // Remove from search results
      setStaffSearchResults(prev => prev.filter(u => u.id !== userId));
      Alert.alert('Success', 'Participant added to the thread.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add participant');
    } finally {
      setIsAddingParticipant(false);
    }
  }, [addParticipants]);

  const handleLeaveThread = useCallback(() => {
    Alert.alert(
      'Leave Thread',
      'Are you sure you want to leave this thread? You will no longer see new messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveThread();
              onBack();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to leave thread');
            }
          },
        },
      ],
    );
  }, [leaveThread, onBack]);

  // Handle swipe back gesture
  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      // Only allow right swipe (going back)
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd(event => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe threshold reached, animate and trigger back navigation
        translateX.value = withSpring(0, { damping: 20 });
        // Call onBack immediately to trigger parent's animation
        runOnJS(onBack)();
      } else {
        // Not enough swipe, animate back to original position
        translateX.value = withSpring(0);
      }
    });

  // Animated style for the container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const renderMessage = (message: Message, index: number) => {
    const participant = getParticipant(message);
    const displayName = getDisplayName(message);
    const nextMessage = messages[index + 1];
    const showName =
      !message.isSelf &&
      (!nextMessage ||
        String(nextMessage.senderId) !== String(message.senderId));

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          message.isSelf
            ? styles.messageContainerSelf
            : styles.messageContainerOther,
        ]}
      >
        {!message.isSelf && (
          <View style={styles.avatarContainer}>
            <Avatar
              size={32}
              user={participant ? {
                image: participant.image,
                firstName: participant.firstName,
                lastName: participant.lastName,
              } : undefined}
              initials={getInitials(displayName)}
              style={{ backgroundColor: colors.secondary }}
            />
          </View>
        )}

        <View style={styles.messageContent}>
          {showName && (
            <Text style={[styles.senderName, { color: colors.textSecondary }]}>
              {displayName}
            </Text>
          )}

          <View
            style={[
              styles.messageBubble,
              {
                backgroundColor: message.isSelf
                  ? message.queued
                    ? colors.primary + 'B3' // Dimmed for queued messages
                    : colors.primary
                  : colors.surface,
                shadowColor: colors.shadow,
              },
            ]}
          >
            {message.type === 'image' && message.signedUrl ? (
              <>
                <Image
                  source={{ uri: message.signedUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                {message.text ? (
                  <Text
                    style={[
                      styles.messageText,
                      styles.imageCaption,
                      {
                        color: message.isSelf
                          ? colors.textInverse
                          : colors.text,
                      },
                    ]}
                  >
                    {message.text}
                  </Text>
                ) : null}
              </>
            ) : message.type === 'image' && !message.signedUrl ? (
              <View style={styles.loadingImageContainer}>
                <ActivityIndicator
                  size="small"
                  color={message.isSelf ? colors.textInverse : colors.primary}
                />
                <Text
                  style={[
                    styles.loadingImageText,
                    {
                      color: message.isSelf ? colors.textInverse : colors.text,
                    },
                  ]}
                >
                  Loading image...
                </Text>
              </View>
            ) : message.type === 'audio' ? (
              <InlineAudioPlayer
                audioUrl={message.signedUrl}
                mediaPath={message.mediaUrl}
                isSelf={message.isSelf}
              />
            ) : message.type === 'call-summary' ? (
              <CallSummaryMessage
                messageText={message.text}
                isSelf={message.isSelf}
              />
            ) : message.type === 'patient-card' ? (
              <PatientCardMessage
                messageText={message.text}
                isSelf={message.isSelf}
              />
            ) : message.text ? (
              <Text
                style={[
                  styles.messageText,
                  {
                    color: message.isSelf ? colors.textInverse : colors.text,
                  },
                ]}
              >
                {message.text}
              </Text>
            ) : null}

            <View style={styles.timestampRow}>
              {message.queued && (
                <Text
                  style={[
                    styles.queuedLabel,
                    { color: colors.textInverse + 'B3' },
                  ]}
                >
                  Queued
                </Text>
              )}
              <Text
                style={[
                  styles.timestamp,
                  {
                    color: message.isSelf
                      ? colors.textInverse + 'B3' // 70% opacity
                      : colors.textSecondary,
                  },
                ]}
              >
                {formatTime(new Date(message.timestamp))}
              </Text>
            </View>
          </View>
        </View>

        {message.isSelf && <View style={styles.avatarPlaceholder} />}
      </View>
    );
  };

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
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            Messages
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorCard
          error={error}
          onRetry={retry}
          title="Failed to Load Messages"
        />
      </SafeAreaView>
    );
  }

  // Check if this is an internal thread (can send messages)
  const canSend = thread.type === 'internal';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.flex,
          animatedStyle,
          { backgroundColor: colors.background },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
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
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={[styles.backButtonText, { color: colors.primary }]}>
                  ← Back
                </Text>
              </TouchableOpacity>

              {/* Center: Title + tappable participant info */}
              <TouchableOpacity
                style={styles.headerTitleContainer}
                onPress={() => setParticipantsModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.headerTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {getThreadTitle()}
                </Text>
                {threadInfo?.participants && threadInfo.participants.length > 0 && (
                  <View style={styles.headerParticipantRow}>
                    {/* Stacked avatars */}
                    <View style={styles.stackedAvatars}>
                      {threadInfo.participants.slice(0, 4).map((p, i) => (
                        <View
                          key={p.id}
                          style={[
                            styles.stackedAvatarWrapper,
                            { marginLeft: i === 0 ? 0 : -6, zIndex: 4 - i },
                          ]}
                        >
                          <Avatar
                            size={20}
                            user={{
                              image: p.image,
                              firstName: p.firstName,
                              lastName: p.lastName,
                            }}
                            initials={getInitials(
                              `${p.firstName || ''} ${p.lastName || ''}`.trim() || '?',
                            )}
                            style={{ backgroundColor: colors.secondary, borderWidth: 1.5, borderColor: colors.surface }}
                          />
                        </View>
                      ))}
                      {threadInfo.participants.length > 4 && (
                        <View style={[styles.stackedAvatarWrapper, { marginLeft: -6 }]}>
                          <View style={[styles.overflowBadge, { backgroundColor: colors.secondary }]}>
                            <Text style={[styles.overflowBadgeText, { color: colors.textSecondary }]}>
                              +{threadInfo.participants.length - 4}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                      {threadInfo.participants.length} participant
                      {threadInfo.participants.length !== 1 ? 's' : ''} ›
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Right: Actions */}
              <View style={styles.headerActions}>
                {thread.type === 'internal' && (
                  <TouchableOpacity
                    style={[styles.headerIconButton, { backgroundColor: colors.secondary }]}
                    onPress={() => {
                      setStaffSearchQuery('');
                      setStaffSearchResults([]);
                      setAddParticipantModalVisible(true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <UserPlus size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.headerIconButton, { backgroundColor: colors.secondary }]}
                  onPress={() => setParticipantsModalVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Users size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

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
                    ? ` — ${queuedCount} message${queuedCount !== 1 ? 's' : ''} queued`
                    : ''}
                </Text>
                <Text
                  style={[
                    styles.offlineBannerSubtext,
                    { color: colors.textSecondary },
                  ]}
                >
                  Messages will be sent when you reconnect
                </Text>
              </View>
            )}

            {/* Messages */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  Loading messages...
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() =>
                  scrollViewRef.current?.scrollToEnd({ animated: true })
                }
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>💬</Text>
                    <Text
                      style={[
                        styles.emptyStateText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No messages yet
                    </Text>
                  </View>
                ) : (
                  messages.map((message, index) => renderMessage(message, index))
                )}
              </ScrollView>
            )}

            {/* Message Input - Only for internal threads */}
            {canSend && (
              <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
                <MessageInput
                  value={newMessage}
                  onChangeText={setNewMessage}
                  onSend={sendMessage}
                  onSendAudio={sendAudio}
                  sending={sending}
                  onPlusPress={() => setPatientSearchVisible(true)}
                  placeholder={
                    isOffline
                      ? 'Type a message (will send when online)...'
                      : 'Type a message...'
                  }
                />
              </View>
            )}

            {/* Patient Search Modal */}
            <PatientSearchModal
              visible={patientSearchVisible}
              onClose={() => setPatientSearchVisible(false)}
              onSelectPatient={handleSelectPatient}
            />

            {/* Info banner for telegram threads */}
            {!canSend && (
              <View
                style={[
                  styles.infoBanner,
                  {
                    backgroundColor: colors.warning + '20',
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, spacing.md),
                  },
                ]}
              >
                <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                  Replying to patient messages is not available on mobile yet
                </Text>
              </View>
            )}

            {/* Participants Modal */}
            <Modal
              visible={participantsModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setParticipantsModalVisible(false)}
            >
              <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Participants ({threadInfo?.participants?.length || 0})
                  </Text>
                  <TouchableOpacity onPress={() => setParticipantsModalVisible(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={threadInfo?.participants || []}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.modalList}
                  renderItem={({ item }) => (
                    <View style={[styles.participantRow, { borderBottomColor: colors.border }]}>
                      <Avatar
                        size={40}
                        user={{
                          image: item.image,
                          firstName: item.firstName,
                          lastName: item.lastName,
                        }}
                        initials={getInitials(
                          `${item.firstName || ''} ${item.lastName || ''}`.trim() || '?',
                        )}
                        style={{ backgroundColor: colors.secondary }}
                      />
                      <View style={styles.participantInfo}>
                        <Text style={[styles.participantName, { color: colors.text }]}>
                          {`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Unknown'}
                        </Text>
                        {item.accountType && (
                          <Text style={[styles.participantRole, { color: colors.textSecondary }]}>
                            {item.accountType}
                          </Text>
                        )}
                      </View>
                      {item.id === currentUserId && (
                        <Text style={[styles.youBadge, { color: colors.primary }]}>You</Text>
                      )}
                    </View>
                  )}
                  ListFooterComponent={
                    !isSystemGroup && thread.type === 'internal' ? (
                      <TouchableOpacity
                        style={[styles.leaveButton, { borderColor: colors.error }]}
                        onPress={() => {
                          setParticipantsModalVisible(false);
                          handleLeaveThread();
                        }}
                      >
                        <LogOut size={16} color={colors.error} />
                        <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                          Leave Thread
                        </Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              </SafeAreaView>
            </Modal>

            {/* Add Participant Modal */}
            <Modal
              visible={addParticipantModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setAddParticipantModalVisible(false)}
            >
              <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Add Participants
                  </Text>
                  <TouchableOpacity onPress={() => setAddParticipantModalVisible(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Search input */}
                <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                  <Search size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search by name or email..."
                    placeholderTextColor={colors.textSecondary}
                    value={staffSearchQuery}
                    onChangeText={searchStaff}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {isSearchingStaff && (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                </View>

                <FlatList
                  data={staffSearchResults}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.modalList}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    staffSearchQuery.trim().length >= 2 && !isSearchingStaff ? (
                      <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                        No users found
                      </Text>
                    ) : staffSearchQuery.trim().length < 2 ? (
                      <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                        Type at least 2 characters to search
                      </Text>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <View style={[styles.participantRow, { borderBottomColor: colors.border }]}>
                      <Avatar
                        size={40}
                        user={{
                          image: item.image || item.google_image,
                          firstName: item.first_name,
                          lastName: item.last_name,
                        }}
                        initials={getInitials(
                          `${item.first_name || ''} ${item.last_name || ''}`.trim() || '?',
                        )}
                        style={{ backgroundColor: colors.secondary }}
                      />
                      <View style={styles.participantInfo}>
                        <Text style={[styles.participantName, { color: colors.text }]}>
                          {`${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email || 'Unknown'}
                        </Text>
                        {item.account_type && (
                          <Text style={[styles.participantRole, { color: colors.textSecondary }]}>
                            {item.account_type}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleAddParticipant(item.id)}
                        disabled={isAddingParticipant}
                      >
                        {isAddingParticipant ? (
                          <ActivityIndicator size="small" color={colors.textInverse} />
                        ) : (
                          <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </SafeAreaView>
            </Modal>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  headerParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: spacing.xs,
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatarWrapper: {
    // Individual zIndex set inline
  },
  overflowBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.semibold,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    marginTop: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  offlineBanner: {
    paddingHorizontal: spacing.base,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.massive,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.base,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  messageContainerSelf: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatarPlaceholder: {
    width: 32,
    marginLeft: spacing.sm,
  },
  messageContent: {
    maxWidth: '75%',
  },
  senderName: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
    marginLeft: spacing.md,
  },
  messageBubble: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
  },
  imageCaption: {
    marginTop: spacing.sm,
  },
  loadingImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loadingImageText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  audioText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
  },
  queuedLabel: {
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  infoBanner: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  modalList: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  participantRole: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  youBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  leaveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
  },
  emptySearchText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
    fontSize: typography.fontSize.sm,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 56,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ThreadDetailScreenView;
