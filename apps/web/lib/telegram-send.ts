// apps/web/lib/telegram-send.ts
//
// Sending a text message to a patient's Telegram thread, extracted from
// app/api/telegram-thread/[telegramChatId]/send-text/route.ts so the
// prescription send-to-patient route can reuse it rather than growing a second
// copy of the signature rules and the persistence fallback.

import { randomUUID } from "crypto";
import type { TelegramMessage } from "@/db/schema";
import { addMessageToThread } from "@/lib/telegram-db-helpers";
import {
  resolveMessageSignature,
  type SignatureMode,
} from "@/lib/telegram-signature";

// Re-exported so callers keep importing the send surface from one place.
export { resolveMessageSignature };
export type { SignatureMode, SignaturePlan } from "@/lib/telegram-signature";

const TELEGRAM_BOT_API_URL =
  process.env.TELEGRAM_BOT_API_URL || "https://api.telegram.org";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export class TelegramNotConfiguredError extends Error {
  constructor() {
    super("Telegram bot token is not configured");
    this.name = "TelegramNotConfiguredError";
  }
}

export class TelegramSendError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TelegramSendError";
  }
}

async function postToTelegram(chatId: string, messageText: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new TelegramNotConfiguredError();
  }

  const response = await fetch(
    `${TELEGRAM_BOT_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No parse_mode: plain text, so URLs auto-link and nothing needs escaping.
      body: JSON.stringify({ chat_id: chatId, text: messageText }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[telegram-send] Telegram API error:", errorData);
    throw new TelegramSendError(
      `Telegram API responded with status: ${response.status}`,
      response.status,
    );
  }

  return response.json();
}

async function persistMessage(
  chatId: string,
  message: TelegramMessage,
): Promise<void> {
  try {
    await addMessageToThread(chatId, message);
  } catch (dbError) {
    // The patient already has the message; losing our copy of it is bad but
    // not worth failing the send over.
    console.error("[telegram-send] Failed to save message to database:", dbError);
  }
}

export interface SendTelegramTextInput {
  chatId: string;
  text: string;
  senderName: string;
  senderId: string | null;
  omitSignature?: boolean;
  signatureMode?: SignatureMode;
  originalMessage?: string;
  /**
   * Extra messages posted in order after the body and *before* the signature.
   *
   * This is how a prescription's access code lands as its own message with
   * nothing else in it, so a long-press copies just the digits.
   */
  followUps?: string[];
}

export interface SendTelegramTextResult {
  telegramResponse: unknown;
  savedMessage: TelegramMessage;
}

/**
 * Posts the body, then any follow-ups, then the signature.
 *
 * Only the body is fatal. Everything after it is best-effort: the message the
 * patient actually needs has already landed, so failing the whole call would
 * misreport a delivery that happened.
 */
export async function sendTelegramText({
  chatId,
  text,
  senderName,
  senderId,
  omitSignature,
  signatureMode,
  originalMessage,
  followUps = [],
}: SendTelegramTextInput): Promise<SendTelegramTextResult> {
  const { primaryText, followUpSignature } = resolveMessageSignature({
    text,
    senderName,
    omitSignature,
    signatureMode,
  });

  const telegramResponse = await postToTelegram(chatId, primaryText);

  const savedMessage: TelegramMessage = {
    id: randomUUID(),
    text: primaryText,
    sender: senderName,
    senderId,
    timestamp: new Date(),
    type: "text",
    ...(originalMessage ? { originalMessage } : {}),
  };
  await persistMessage(chatId, savedMessage);

  const trailing = [...followUps, ...(followUpSignature ? [followUpSignature] : [])];
  for (const message of trailing) {
    try {
      await postToTelegram(chatId, message);
      await persistMessage(chatId, {
        id: randomUUID(),
        text: message,
        sender: senderName,
        senderId,
        timestamp: new Date(),
        type: "text",
      });
    } catch (followUpError) {
      console.error(
        "[telegram-send] Failed to send follow-up message:",
        followUpError,
      );
    }
  }

  return { telegramResponse, savedMessage };
}
