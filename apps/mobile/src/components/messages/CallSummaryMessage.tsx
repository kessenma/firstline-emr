// apps/mobile/src/components/messages/CallSummaryMessage.tsx
//
// Renders a `call-summary` message — the record /api/calls/[id]/end drops into
// the participants' staff thread when a call finishes.
//
// Modeled on PatientCardMessage: the message `text` is JSON, and this component
// is what stops the raw payload being printed. ThreadDetailScreenView falls
// through to a plain <Text> for unknown types, so this must stay wired up.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, PhoneMissed, PhoneOff } from 'lucide-react-native';
import {
  parseCallSummary,
  formatDuration,
  type CallSummaryPayload,
} from '@fajr/shared/calls';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface CallSummaryMessageProps {
  messageText: string;
  isSelf?: boolean;
}

type Tone = 'normal' | 'muted' | 'bad';

/** Human phrasing per terminal status, from the reader's point of view. */
function describe(payload: CallSummaryPayload): {
  label: string;
  Icon: typeof Phone;
  tone: Tone;
} {
  switch (payload.status) {
    case 'completed':
      return { label: 'Call ended', Icon: Phone, tone: 'normal' };
    case 'missed':
      return { label: 'Missed call', Icon: PhoneMissed, tone: 'bad' };
    case 'declined':
      return { label: 'Call declined', Icon: PhoneOff, tone: 'muted' };
    case 'canceled':
      return { label: 'Call canceled', Icon: PhoneOff, tone: 'muted' };
    case 'failed':
      return { label: 'Call failed', Icon: PhoneOff, tone: 'bad' };
    default:
      return { label: 'Call', Icon: Phone, tone: 'normal' };
  }
}

export function CallSummaryMessage({
  messageText,
  isSelf,
}: CallSummaryMessageProps) {
  const colors = useThemeColors();
  const payload = useMemo(() => parseCallSummary(messageText), [messageText]);

  if (!payload) {
    return (
      <Text style={[styles.invalid, { color: colors.textSecondary }]}>
        [Unreadable call summary]
      </Text>
    );
  }

  const { label, Icon, tone } = describe(payload);
  const started = new Date(payload.startedAt);
  const iconColor =
    tone === 'bad'
      ? colors.error
      : tone === 'muted'
        ? colors.textSecondary
        : colors.primary;

  const subtitle =
    (Number.isNaN(started.getTime())
      ? ''
      : started.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })) +
    (payload.durationSeconds != null && payload.durationSeconds > 0
      ? ` · ${formatDuration(payload.durationSeconds)}`
      : '');

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: isSelf ? colors.primary + '10' : colors.surface,
        },
      ]}
    >
      <Icon size={18} color={iconColor} />
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {payload.kind === 'video' ? (
            <Text style={{ color: colors.textSecondary }}> · video</Text>
          ) : null}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { flex: 1 },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    marginTop: 1,
  },
  invalid: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
});

export default CallSummaryMessage;
