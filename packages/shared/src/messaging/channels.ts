// Which outbound messaging channels exist, and how to label them.
//
// Telegram is the only one today, but the labels and brand colour were already
// hardcoded at each call site ("Send on Telegram", #24A1DE, the Telegram mark).
// Adding WhatsApp that way means finding every one of them. Registering the
// channel here instead makes it one entry plus one icon per platform.
//
// Icons are deliberately NOT here: web renders a DOM <svg>, mobile needs
// react-native-svg, and no single component serves both. Each platform keeps a
// thin icon map keyed by `MessagingChannel`.

export type MessagingChannel = 'telegram';

export interface ChannelDescriptor {
  id: MessagingChannel;
  /** The channel's own name, never translated. */
  label: string;
  /** Official brand colour, for the icon tint. */
  brandColor: string;
  sendLabel: string;
  sendingLabel: string;
  sentLabel: string;
  failedLabel: string;
  /** Shown when the patient has no address on any channel. */
  unreachableLabel: string;
}

export const MESSAGING_CHANNELS: Record<MessagingChannel, ChannelDescriptor> = {
  telegram: {
    id: 'telegram',
    label: 'Telegram',
    brandColor: '#24A1DE',
    sendLabel: 'Send on Telegram',
    sendingLabel: 'Sending…',
    sentLabel: 'Sent on Telegram',
    failedLabel: 'Send failed — retry',
    unreachableLabel: 'This patient has no Telegram chat',
  },
};

/** Just the identifying fields a channel lookup needs off a patient record. */
export interface ChannelAddressable {
  telegramChatId?: string | null;
}

/**
 * Which channel this patient is currently reachable on, or `null`.
 *
 * Order matters once there is more than one: the first channel with an address
 * wins, so put the preferred one first.
 */
export function getPatientChannel(
  patient: ChannelAddressable | null | undefined,
): MessagingChannel | null {
  if (patient?.telegramChatId?.trim()) return 'telegram';
  return null;
}

export function getChannelDescriptor(
  channel: MessagingChannel | null | undefined,
): ChannelDescriptor | null {
  return channel ? MESSAGING_CHANNELS[channel] : null;
}
