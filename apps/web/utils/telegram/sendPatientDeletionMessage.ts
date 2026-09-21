// apps/web/utils/telegram/sendPatientDeletionMessage.ts

import TelegramBot from "node-telegram-bot-api";

// Lazy-initialized to avoid crashing during Next.js build (no env vars at build time)
let _bot: TelegramBot | null = null;
function getBot(): TelegramBot {
    if (!_bot) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error("Telegram bot token is not defined in environment variables.");
        }
        _bot = new TelegramBot(botToken, { polling: false });
    }
    return _bot;
}

// Define translations for the patient deletion message
const deletionMessages = {
    arabic: `
📢 *تم حذف بيانات المريض: {name}*
❌ تم حذف جميع بياناتك بالكامل من نظامنا.
    `,
    english: `
📢 *Patient Data Deleted: {name}*
❌ Your data has been fully removed from our system.
    `,
    farsi: `
📢 *داده های بیمار حذف شد: {name}*
❌ تمام داده های شما به طور کامل از سیستم ما حذف شده است.
    `,
    pashto: `
📢 *د ناروغ معلومات ړنګ شول: {name}*
❌ ستاسو ټول معلومات زموږ له سیسټم څخه بشپړ لرې شوي دي.
    `,
} as const;

type SupportedLanguages = keyof typeof deletionMessages; // ✅ Restricts valid languages

// Function to send the patient deletion message
export async function sendPatientDeletionMessage(chatId: string, patientName: string, language: string): Promise<void> {
    if (!chatId || !patientName) {
        console.error(`[ERROR] Invalid chatId (${chatId}) or patientName (${patientName}) for deletion message.`);
        return;
    }

    // Ensure language is valid, default to English if not found
    const supportedLanguages: SupportedLanguages[] = ["arabic", "farsi", "pashto", "english"];
    const patientLanguage = supportedLanguages.includes(language.toLowerCase() as SupportedLanguages)
        ? (language.toLowerCase() as SupportedLanguages)
        : "english";

    const deletionMessage = deletionMessages[patientLanguage].replace("{name}", patientName);

    try {
        await getBot().sendMessage(chatId, deletionMessage);
        console.log(`[INFO] Sent deletion message to chat ID ${chatId} in ${patientLanguage}`);
    } catch (error) {
        console.error(`[ERROR] Failed to send deletion message to chat ID ${chatId}:`, error);
    }
}