/**
 * Utility functions for Telegram bot integration
 */

/**
 * Gets the telegram bot name from environment variables
 * Falls back to the live production bot ('fajr_mission_bot') if not set
 */
export function getTelegramBotName(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'fajr_mission_bot';
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