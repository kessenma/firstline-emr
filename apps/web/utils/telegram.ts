/**
 * Utility functions for Telegram bot integration
 */

/**
 * Gets the telegram bot name from environment variables
 * Falls back to the Firstline bot handle if not set. NOTE: this bot must be
 * created in BotFather before it resolves -- the old handle is retired.
 */
export function getTelegramBotName(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'firstline_care_bot';
}

/**
 * Constructs a telegram bot URL from the bot name
 * @param botName - The telegram bot name (without @)
 * @returns The full telegram URL
 */
export function getTelegramBotUrl(botName?: string): string {
  const name = botName || getTelegramBotName();
  return `https://t.me/${name}`;
}