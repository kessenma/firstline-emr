// apps/mobile/src/components/patient-chart/messaging/utils/telegramTypes.ts
// TypeScript interfaces for Telegram messaging feature

export interface TelegramMessage {
  _id: string;
  telegramChatId?: string;
  text: string;
  originalMessage?: string;
  sender: string;
  timestamp: Date;
  isSelf: boolean;
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  encryptedMedia?: string;
  encryptionKey?: string;
  signedUrl?: string;
  format?: string;
  translatedText?: string;
  isTranslated?: boolean;
  showTranslated?: boolean;
}

export interface TelegramParticipant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
}

export interface TelegramThreadInfo {
  patientId?: string;
  patient?: {
    firstName: string;
    lastName: string;
    email?: string;
    telegramChatId?: string;
  };
  participants?: TelegramParticipant[];
  unreadCount?: number;
  status?: string;
}

export interface MessageCacheData {
  messages: TelegramMessage[];
  threadInfo: TelegramThreadInfo | null;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface UseTelegramMessagesViewModelParams {
  telegramChatId: string;
  patientId: string;
  enabled?: boolean;
  languageUsed?: string;
}

export interface TelegramMessagesViewModel {
  // Messages
  messages: TelegramMessage[];
  isLoadingMessages: boolean;
  loadMessages: (forceRefresh?: boolean) => Promise<void>;

  // Sending
  newMessage: string;
  setNewMessage: (text: string) => void;
  sendMessage: () => Promise<void>;
  sendImage: (uri: string) => Promise<void>;
  sendAudio: (uri: string, duration: number) => Promise<void>;
  isSending: boolean;

  // Error Handling
  error: string | null;
  retry: () => void;

  // Translation
  translateMessages: () => Promise<{ translatedCount: number }>;
  isTranslating: boolean;
  toggleTranslation: (messageId: string) => void;

  // Real-time
  isConnected: boolean;

  // Thread Info
  threadInfo: TelegramThreadInfo | null;

  // Refresh
  refresh: () => Promise<void>;
}
