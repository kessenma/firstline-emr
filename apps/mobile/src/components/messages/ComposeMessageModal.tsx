// apps/mobile/src/components/messages/ComposeMessageModal.tsx
// Modal for composing new direct messages or group chats

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';
import { UserSearchInput, SearchableUser } from './UserSearchInput';
import { Thread } from '../../types/messages';

interface ComposeMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onThreadCreated: (thread: Thread) => void;
}

export function ComposeMessageModal({
  visible,
  onClose,
  onThreadCreated,
}: ComposeMessageModalProps) {
  const colors = useThemeColors();
  const [selectedUsers, setSelectedUsers] = useState<SearchableUser[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect mode based on number of selected users
  const isGroupChat = selectedUsers.length > 1;

  const handleUserSelect = useCallback((user: SearchableUser) => {
    setSelectedUsers((prev) => {
      if (prev.find((u) => u.id === user.id)) {
        return prev;
      }
      return [...prev, user];
    });
    setError(null);
  }, []);

  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleStartConversation = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const token = storageUtils.getToken();
      let threadData: any;

      if (selectedUsers.length === 1) {
        // Create or find 1:1 thread
        const url = getApiUrl('/internal-messages/direct');
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ participantId: selectedUsers[0].id }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to start conversation');
        }

        const data = await res.json();
        threadData = data.thread;
      } else {
        // Create group thread
        const url = getApiUrl('/internal-messages/group');
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            participantIds: selectedUsers.map((u) => u.id),
            title: groupTitle || undefined,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create group chat');
        }

        const data = await res.json();
        threadData = data.thread;
      }

      // Show success state briefly
      setIsSuccess(true);

      // Convert API response to Thread type
      const thread: Thread = {
        id: threadData.id,
        title: threadData.title || '',
        participants: threadData.participants || [],
        messages: threadData.messages || [],
        unreadCount: 0,
        type: 'internal',
        isGroupChat: threadData.isGroupChat || selectedUsers.length > 1,
        lastActivity: threadData.lastActivity || new Date().toISOString(),
      };

      // Wait for animation then close
      setTimeout(() => {
        onThreadCreated(thread);
        handleClose();
      }, 600);
    } catch (err) {
      console.error('Error starting conversation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to start conversation. Please try again.',
      );
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating && !isSuccess) return; // Prevent closing while creating

    onClose();
    // Reset state after close
    setTimeout(() => {
      setSelectedUsers([]);
      setGroupTitle('');
      setError(null);
      setIsCreating(false);
      setIsSuccess(false);
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
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
            <TouchableOpacity
              onPress={handleClose}
              disabled={isCreating && !isSuccess}
              style={styles.headerButton}
            >
              <Text
                style={[
                  styles.headerButtonText,
                  { color: isCreating && !isSuccess ? colors.textSecondary : colors.primary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              New Message
            </Text>

            <TouchableOpacity
              onPress={handleStartConversation}
              disabled={isCreating || selectedUsers.length === 0}
              style={styles.headerButton}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.headerButtonText,
                    {
                      color:
                        selectedUsers.length === 0
                          ? colors.textSecondary
                          : colors.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {isGroupChat ? 'Create' : 'Start'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          {isSuccess ? (
            // Success state
            <View style={styles.successContainer}>
              <Text style={[styles.successIcon, { color: colors.success }]}>✓</Text>
              <Text style={[styles.successText, { color: colors.text }]}>
                {isGroupChat ? 'Group created!' : 'Starting conversation...'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              {/* User Search */}
              <View style={styles.searchSection}>
                <UserSearchInput
                  selectedUsers={selectedUsers}
                  onUserSelect={handleUserSelect}
                  onUserRemove={handleRemoveUser}
                  disabled={isCreating}
                />
              </View>

              {/* Group Title (only shown when 2+ users selected) */}
              {isGroupChat && (
                <View style={styles.groupTitleSection}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Group Name (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.groupTitleInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter a name for this group..."
                    placeholderTextColor={colors.textSecondary}
                    value={groupTitle}
                    onChangeText={setGroupTitle}
                    editable={!isCreating}
                  />
                </View>
              )}

              {/* Error Message */}
              {error && (
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: colors.error + '15' },
                  ]}
                >
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Help text */}
              <View style={styles.helpSection}>
                <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                  {selectedUsers.length === 0
                    ? 'Search for a staff member to start a conversation'
                    : selectedUsers.length === 1
                      ? 'This will start a direct message with this person'
                      : `This will create a group chat with ${selectedUsers.length} people`}
                </Text>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: typography.fontSize.base,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  searchSection: {
    zIndex: 100, // Ensure dropdown appears above other content
  },
  groupTitleSection: {
    marginTop: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  groupTitleInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
  },
  errorContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  helpSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 64,
    // color set inline via colors.success
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ComposeMessageModal;
