// apps/mobile/src/components/patient-chart/video-call/VideoCallView.tsx
//
// Pre-call surface for the Video section: start button, invite link once a call
// is live, and the call log underneath. The live call itself renders in the
// dedicated VideoCallSheet, not here.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Video as VideoIcon,
  AlertCircle,
  PhoneOff,
  Maximize2,
} from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useVideoCallViewModel } from './hooks/useVideoCallViewModel';
import { InviteLinkCard } from './components/InviteLinkCard';
import { CallHistoryList } from './components/CallHistoryList';
import { PreviousTranscriptsList } from './components/PreviousTranscriptsList';
import { TranscriptionJobStatus } from './components/TranscriptionJobStatus';
import { SendInviteModal } from './components/SendInviteModal';

export const VideoCallView: React.FC = () => {
  const colors = useThemeColors();
  const {
    patientName,
    canSendViaTelegram,
    connectionState,
    inCall,
    inviteUrl,
    error,
    sheetPresented,
    history,
    loadingHistory,
    transcripts,
    loadingTranscripts,
    patientId,
    invitePreview,
    inviteSendState,
    invitePromptVisible,
    dismissInvitePrompt,
    startCall,
    endCall,
    returnToCall,
    sendInviteViaTelegram,
    saveCallNotes,
    clearError,
  } = useVideoCallViewModel();

  const starting =
    connectionState === 'connecting' ||
    connectionState === 'requesting-permissions';

  const confirmEnd = () => {
    Alert.alert(
      'End call?',
      `This will end the video call with ${patientName}.`,
      [
        { text: 'Keep talking', style: 'cancel' },
        {
          text: 'End call',
          style: 'destructive',
          onPress: () => void endCall(),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!inCall ? (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={() => void startCall()}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <VideoIcon size={18} color={colors.textInverse} />
          )}
          <Text style={[styles.startText, { color: colors.textInverse }]}>
            {starting ? 'Starting…' : `Start video call with ${patientName}`}
          </Text>
        </TouchableOpacity>
      ) : (
        // Controls live here as well as in the sheet, deliberately. The sheet
        // can be swiped away mid-call; if hanging up were only possible from
        // inside it, doing so would strand the call with no way to end it.
        <View style={styles.inCallBlock}>
          <Text style={[styles.inCallHint, { color: colors.textSecondary }]}>
            {sheetPresented
              ? 'Call in progress. Minimize the call to keep browsing the chart.'
              : 'Call in progress, but the call window is hidden.'}
          </Text>

          <View style={styles.inCallActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={returnToCall}
            >
              <Maximize2 size={16} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>
                Return to call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endButton, { backgroundColor: colors.error }]}
              onPress={confirmEnd}
            >
              <PhoneOff size={16} color={colors.textInverse} />
              <Text style={[styles.endText, { color: colors.textInverse }]}>
                End call
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && (
        <TouchableOpacity
          style={[styles.error, { backgroundColor: colors.surfaceSecondary }]}
          onPress={clearError}
        >
          <AlertCircle size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </TouchableOpacity>
      )}

      {inviteUrl && (
        <InviteLinkCard
          inviteUrl={inviteUrl}
          canSendViaTelegram={canSendViaTelegram}
          sendState={inviteSendState}
          onSendViaTelegram={sendInviteViaTelegram}
        />
      )}

      <SendInviteModal
        visible={invitePromptVisible}
        patientName={patientName}
        invitePreview={invitePreview}
        sendState={inviteSendState}
        onSend={sendInviteViaTelegram}
        onDismiss={dismissInvitePrompt}
      />


      {/* Transcription status for calls with this patient. Reads the
          app-level job context, not the call session — by the time this
          matters the call is over and its provider may be unmounted. */}
      <TranscriptionJobStatus patientId={patientId} />

      <View style={styles.historySection}>
        <Text style={[styles.historyHeading, { color: colors.text }]}>
          Call history
        </Text>
        <CallHistoryList
          sessions={history}
          loading={loadingHistory}
          onSaveNotes={saveCallNotes}
        />
      </View>

      <View style={styles.historySection}>
        <Text style={[styles.historyHeading, { color: colors.text }]}>
          Previous call transcripts
        </Text>
        <PreviousTranscriptsList
          transcripts={transcripts}
          loading={loadingTranscripts}
          patientName={patientName}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  startText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  inCallBlock: { gap: spacing.sm },
  inCallHint: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  inCallActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  endButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  endText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  historySection: { gap: spacing.sm },
  historyHeading: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default VideoCallView;
