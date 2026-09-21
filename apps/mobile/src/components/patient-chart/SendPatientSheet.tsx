// apps/mobile/src/components/patient-chart/SendPatientSheet.tsx
// Sheet for sending a patient card to an internal messaging thread.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { BottomSheet, BottomSheetScrollView, useBottomSheetKeyboard } from '../BottomSheet';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { TABLES } from '../../db';
import { TokenStorage } from '../../services/TokenStorage';
import { getApiUrl } from '../../config';
import { useToast } from '../../hooks/useToast';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useSyncConnection } from '../../hooks/powersync';
import { RecipientPicker } from './RecipientPicker';
import {
  buildPatientCardPayload,
  serializePatientCard,
  getPrimarySpecialty,
  type RecipientUser,
} from '@fajr/shared/patient-share';

interface InternalThreadRow {
  id: string;
  title: string | null;
  last_activity: string | null;
  participants: string | null;
  is_group_chat: number | null;
}

/** The patient this sheet sends — not the wire format. See `PatientCardPayload`
 *  in `@fajr/shared/patient-share` for what actually goes over the wire. */
interface SendablePatient {
  id: string;
  patientName?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  priority?: string;
  /** Optional: `PatientInfo` doesn't carry specialties, so the chart entry
   *  point leaves this unset and the card renders without specialty chips. */
  specialties?: string[] | null;
  /** Scopes the "Doctors" recipient tab to this patient's mission. */
  missionId?: string | null;
  hospital?: string;
  chiefComplaint?: string;
  diagnosis?: string;
}

export interface SendPatientSheetProps {
  visible: boolean;
  onClose: () => void;
  patient: SendablePatient | null;
  onGoToChatAfterSend?: (threadId: string) => void;
  onFallbackBack: () => void;
}

export const SendPatientSheet: React.FC<SendPatientSheetProps> = ({
  visible,
  onClose,
  patient,
  onGoToChatAfterSend,
  onFallbackBack,
}) => {
  const { toast } = useToast();
  const colors = useThemeColors();
  const keyboardHeight = useBottomSheetKeyboard();
  const { isConnected } = useSyncConnection();
  const isOffline = !isConnected;
  const [selectedRecipient, setSelectedRecipient] = React.useState<RecipientUser | null>(null);
  const [attachMessage, setAttachMessage] = React.useState('');
  const [sendingToThread, setSendingToThread] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  const currentUserId = React.useMemo(
    () => String(TokenStorage.getUser()?.id || ''),
    [],
  );

  const internalThreadsQuery = usePowerSyncQuery<InternalThreadRow>(
    `SELECT id, title, last_activity, participants, is_group_chat
     FROM ${TABLES.INTERNAL_MESSAGE_THREADS}
     WHERE status = 'active'
       AND participants LIKE '%' || ? || '%'
     ORDER BY last_activity DESC`,
    [currentUserId],
    { enabled: visible && !!currentUserId, retry: false },
  );

  // Map of counterparty userId -> existing 1:1 thread id. Sending to someone
  // already in this map works offline; anyone else needs the server to create
  // the thread first.
  const existingThreadByUserId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const row of internalThreadsQuery.data || []) {
      if (row.is_group_chat) continue;
      let participants: string[] = [];
      try {
        const parsed = JSON.parse(row.participants || '[]');
        if (Array.isArray(parsed)) participants = parsed.filter((p: unknown) => typeof p === 'string');
      } catch {
        continue;
      }
      if (participants.length !== 2) continue;
      const other = participants.find(p => p !== currentUserId);
      if (other && !map.has(other)) map.set(other, row.id);
    }
    return map;
  }, [internalThreadsQuery.data, currentUserId]);

  const existingThreadUserIds = React.useMemo(
    () => new Set(existingThreadByUserId.keys()),
    [existingThreadByUserId],
  );

  const createDirectThread = React.useCallback(async (participantId: string) => {
    const token = TokenStorage.getAuthToken();
    if (!token) throw new Error('No authentication token found. Please log in again.');
    const res = await fetch(getApiUrl('/internal-messages/direct'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ participantId }),
    });
    if (!res.ok) throw new Error('Could not open a chat with that person');
    const data = await res.json();
    const threadId = data?.thread?.id;
    if (!threadId) throw new Error('Could not open a chat with that person');
    return threadId as string;
  }, []);

  // Reset state when sheet opens
  React.useEffect(() => {
    if (visible) {
      setSelectedRecipient(null);
      setAttachMessage('');
      setSendError(null);
      void internalThreadsQuery.refetch();
    }
  }, [visible]);

  const sendInternalMessage = React.useCallback(
    async (threadId: string, body: { text: string; type: 'text' | 'patient-card' }) => {
      const token = TokenStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const url = getApiUrl(
        `/internal-messages/${encodeURIComponent(threadId)}`,
      );
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }
    },
    [],
  );

  const handleSend = React.useCallback(async () => {
    if (!selectedRecipient) {
      setSendError('Choose who to send this patient to.');
      return;
    }
    const payload = patient ? buildPatientCardPayload(patient) : null;
    if (!payload) {
      setSendError('Patient details are still loading. Please try again.');
      return;
    }

    setSendingToThread(true);
    setSendError(null);
    try {
      // Prefer an existing DM thread — that path works offline. Otherwise ask
      // the server to create one (dedupes via getOrCreateDirectThread).
      let targetThreadId = existingThreadByUserId.get(selectedRecipient.id) || '';
      if (!targetThreadId) {
        targetThreadId = await createDirectThread(selectedRecipient.id);
      }
      const cardPayload = serializePatientCard(payload);

      await sendInternalMessage(targetThreadId, {
        text: cardPayload,
        type: 'patient-card',
      });

      const extraMessage = attachMessage.trim();
      if (extraMessage) {
        await sendInternalMessage(targetThreadId, {
          text: extraMessage,
          type: 'text',
        });
      }

      toast({
        title: 'Patient sent',
        description: `Patient card was sent to ${[selectedRecipient.firstName, selectedRecipient.lastName].filter(Boolean).join(' ') || selectedRecipient.email}.`,
        variant: 'success',
      });
      onClose();
      Alert.alert(
        'Patient sent',
        'Do you want to go to that chat now?',
        [
          { text: 'Stay here', style: 'cancel' },
          {
            text: 'Go to chat',
            onPress: () => {
              if (onGoToChatAfterSend) {
                onGoToChatAfterSend(targetThreadId);
                return;
              }
              onFallbackBack();
            },
          },
        ],
      );
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : 'Failed to send patient to the selected thread.',
      );
    } finally {
      setSendingToThread(false);
    }
  }, [
    attachMessage,
    onClose,
    patient,
    selectedRecipient,
    existingThreadByUserId,
    createDirectThread,
    sendInternalMessage,
    toast,
    onGoToChatAfterSend,
    onFallbackBack,
  ]);

  const formatThreadTitle = React.useCallback((thread: InternalThreadRow) => {
    if (thread.title?.trim()) return thread.title.trim();
    let parsedParticipants: unknown[] = [];
    if (typeof thread.participants === 'string') {
      try {
        const parsed = JSON.parse(thread.participants || '[]');
        parsedParticipants = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedParticipants = [];
      }
    }
    if (Array.isArray(parsedParticipants) && parsedParticipants.length > 2) {
      return `Group chat (${parsedParticipants.length})`;
    }
    return 'Direct chat';
  }, []);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Send Patient To Chat"
      snapPoint={70}
      showHandle={true}
      showCloseButton={true}
      rawContent={true}
    >
      <View style={styles.innerContainer}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {patient?.patientName || 'Current patient'}
        </Text>

        {/* rawContent means BottomSheet supplies no scroll view, and the picker
            renders a plain list — so it needs its own bounded scroller. */}
        <BottomSheetScrollView
          style={styles.recipientScroll}
          keyboardShouldPersistTaps="handled"
        >
          <RecipientPicker
            currentUserId={currentUserId}
            missionId={patient?.missionId}
            specialty={getPrimarySpecialty(patient?.specialties)}
            selectedUserId={selectedRecipient?.id ?? null}
            onSelect={setSelectedRecipient}
            existingThreadUserIds={existingThreadUserIds}
            isOffline={isOffline}
          />
        </BottomSheetScrollView>

        <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>Attach Message (Optional)</Text>
        <TextInput
          value={attachMessage}
          onChangeText={setAttachMessage}
          placeholder="Add context after the patient card..."
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[styles.attachMessageInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        />

        {sendError ? <Text style={[styles.errorText, { color: colors.error }]}>{sendError}</Text> : null}

        <View style={[styles.sendActions, keyboardHeight > 0 && { marginBottom: keyboardHeight }]}>
          <TouchableOpacity
            disabled={!selectedRecipient || sendingToThread}
            onPress={() => void handleSend()}
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (!selectedRecipient || sendingToThread) && { backgroundColor: colors.primary + '60' },
            ]}
          >
            {sendingToThread ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={[styles.sendButtonText, { color: colors.surface }]}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  recipientScroll: {
    maxHeight: 320,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  errorBox: {
    paddingVertical: 10,
  },
  retryMiniButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryMiniButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  threadList: {
    maxHeight: 220,
  },
  threadListContent: {
    paddingBottom: 4,
  },
  threadRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  threadMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  emptyThreadsText: {
    paddingVertical: 16,
    textAlign: 'center',
    fontSize: 13,
  },
  messageLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  attachMessageInput: {
    minHeight: 74,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
  },
  sendActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingBottom: 16,
  },
  sendButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 82,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
