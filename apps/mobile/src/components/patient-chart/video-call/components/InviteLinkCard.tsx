// apps/mobile/src/components/patient-chart/video-call/components/InviteLinkCard.tsx
//
// The shareable patient join link, plus a one-tap send into the patient's
// existing Telegram thread.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
// Not react-native's Clipboard: that was extracted from core and only survives
// behind a deprecation shim. The admin view models already use this package.
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Check, Send, Share2 } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { InviteSendState } from '../hooks/useVideoCallViewModel';

interface InviteLinkCardProps {
  inviteUrl: string;
  canSendViaTelegram: boolean;
  /**
   * Owned by the view model, not this card: the same send can be triggered from
   * the post-start prompt, and two copies of the state would disagree about
   * whether the patient already has the link.
   */
  sendState: InviteSendState;
  onSendViaTelegram: () => Promise<boolean>;
}

export const InviteLinkCard: React.FC<InviteLinkCardProps> = ({
  inviteUrl,
  canSendViaTelegram,
  sendState,
  onSendViaTelegram,
}) => {
  const colors = useThemeColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({
      message: `Join your video call with your doctor: ${inviteUrl}`,
    }).catch(() => {});
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.heading, { color: colors.textSecondary }]}>
        Patient join link · expires in 2 hours
      </Text>

      <Text
        style={[styles.url, { color: colors.text }]}
        numberOfLines={2}
        selectable
      >
        {inviteUrl}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.action, { backgroundColor: colors.surface }]}
          onPress={handleCopy}
        >
          {copied ? (
            <Check size={14} color={colors.success} />
          ) : (
            <Copy size={14} color={colors.primary} />
          )}
          <Text style={[styles.actionText, { color: colors.text }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.action, { backgroundColor: colors.surface }]}
          onPress={handleShare}
        >
          <Share2 size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>

        {canSendViaTelegram && (
          <TouchableOpacity
            style={[styles.action, { backgroundColor: colors.surface }]}
            onPress={() => void onSendViaTelegram()}
            disabled={sendState === 'sending' || sendState === 'sent'}
          >
            {sendState === 'sending' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : sendState === 'sent' ? (
              <Check size={14} color={colors.success} />
            ) : (
              <Send size={14} color={colors.primary} />
            )}
            <Text style={[styles.actionText, { color: colors.text }]}>
              {sendState === 'sent'
                ? 'Sent'
                : sendState === 'failed'
                  ? 'Retry'
                  : 'Telegram'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  heading: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  url: {
    fontSize: typography.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default InviteLinkCard;
