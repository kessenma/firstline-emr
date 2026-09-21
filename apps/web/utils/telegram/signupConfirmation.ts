// utils/telegram/signupConfirmation.ts
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

// Function to send-text a Telegram message
export async function sendPatientRegistrationMessage(chatId: string, message: string): Promise<void> {
    if (!chatId || !message) {
        console.error(`Invalid input: chatId=${chatId}, message=${message}`);
        return;
    }

    try {
        await getBot().sendMessage(chatId, message);
        console.log(`Message sent to chat ID ${chatId}`);
    } catch (error) {
        console.error(`Failed to send Telegram message to chat ID ${chatId}:`, error);
    }
}