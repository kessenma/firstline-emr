// apps/web/components/patient-chart/telegram-messages/view-model/types.ts
export interface TelegramMessage {
    _id: string
    telegramChatId?: string
    originalMessage?: string
    text: string
    sender: string
    timestamp: Date
    isSelf: boolean
    type: string
    mediaUrl?: string
    encryptedMedia?: string
    encryptionKey?: string
    signedUrl?: string
    format?: string
    translatedText?: string
    isTranslated?: boolean
    showTranslated?: boolean
}
