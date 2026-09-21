// apps/mobile/src/components/patient-chart/messaging/index.ts
// Barrel export for Telegram messaging components

// Main components
export { TelegramMessagingContainer } from './TelegramMessagingContainer';
export { TelegramMessagingView } from './TelegramMessagingView';

// Sub-components
export { MessageBubble } from './components/MessageBubble';
export { MessageList } from './components/MessageList';
export { MessageRenderer } from './components/MessageRenderer';
export { TelegramHeader } from './components/TelegramHeader';
export { TelegramMessageInput } from './components/TelegramMessageInput';
export { InlineAudioPlayer } from './components/InlineAudioPlayer';

// Hooks
export { useTelegramMessagesViewModel } from './hooks/useTelegramMessagesViewModel';
export type { TelegramMessagesViewModelOffline } from './hooks/useTelegramMessagesViewModel';
export { useTelegramMessageLoading } from './hooks/useTelegramMessageLoading';
export { useTelegramMessageSending } from './hooks/useTelegramMessageSending';
export { useTelegramMediaHandling } from './hooks/useTelegramMediaHandling';
export { useTelegramRealtime } from './hooks/useTelegramRealtime';
export { useTelegramTranslation } from './hooks/useTelegramTranslation';

// Utilities
export { telegramMessageCache } from './utils/telegramMessageCache';

// Types
export type {
  TelegramMessage,
  TelegramThreadInfo,
  TelegramParticipant,
  TelegramMessagesViewModel,
  UseTelegramMessagesViewModelParams,
  MessageCacheData,
} from './utils/telegramTypes';
