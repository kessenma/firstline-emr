// apps/mobile/src/components/patient-chart/video-call/components/SendInviteModal.tsx
//
// Asks, right after a call starts, whether to push the join link into the
// patient's Telegram thread. Before this, the clinician had to find the invite
// card behind the live call sheet, copy the link, and paste it into messaging —
// so a call could easily be running with no way for the patient to reach it.
//
// A plain RN Modal, not a BottomSheet: the call sheet is on screen at this
// moment, and RN's Modal presents as its own native window above everything,
// where a second gorhom sheet would be fighting the first one for the top.

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Send, MessageCircle } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { InviteSendState } from '../hooks/useVideoCallViewModel';

interface SendInviteModalProps {
  visible: boolean;
  patientName: string;
  /** Exactly what the patient will receive, in their language. */
  invitePreview: string;
  sendState: InviteSendState;
  onSend: () => Promise<boolean>;
  onDismiss: () => void;
}

export const SendInviteModal: React.FC<SendInviteModalProps> = ({
  visible,
  patientName,
  invitePreview,
  sendState,
  onSend,
  onDismiss,
}) => {
  const colors = useThemeColors();
  const sending = sendState === 'sending';

  const handleSend = async () => {
    const ok = await onSend();
    // Only dismiss on success: a failed send has to stay visible, or the link
    // silently never reaches the patient.
    if (ok) onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Send the join link to {patientName}?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            It goes straight into their Telegram chat. Your signature follows as
            a separate message, so the link stays tappable.
          </Text>

          <View style={styles.previewHeading}>
            <MessageCircle size={13} color={colors.textSecondary} />
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              Message preview
            </Text>
          </View>

          <ScrollView
            style={[
              styles.preview,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.previewText, { color: colors.text }]}>
              {invitePreview}
            </Text>
          </ScrollView>

          {sendState === 'failed' && (
            <Text style={[styles.failed, { color: colors.error }]}>
              Telegram send failed. Try again, or copy the link from the invite
              card.
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondary, { borderColor: colors.border }]}
              onPress={onDismiss}
              disabled={sending}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>
                Not now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primary, { backgroundColor: colors.primary }]}
              onPress={() => void handleSend()}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Send size={15} color={colors.textInverse} />
              )}
              <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                {sending ? 'Sending…' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
  },
  previewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.xs,
  },
  previewLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  preview: {
    maxHeight: 140,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  previewText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  failed: {
    fontSize: typography.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  primaryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default SendInviteModal;
