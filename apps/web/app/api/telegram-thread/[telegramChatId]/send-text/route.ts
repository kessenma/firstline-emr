// app/api/telegram-thread/[telegramChatId]/send-text/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  validateTelegramChatId,
  validateRequiredFields,
} from "@/lib/validation";
import { getTelegramThreadByChatId } from "@/lib/telegram-db-helpers";
import { resolveSenderIdentity } from "@/lib/telegram-sender-identity";
import {
  sendTelegramText,
  TelegramNotConfiguredError,
  type SignatureMode,
} from "@/lib/telegram-send";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ telegramChatId: string }> },
) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const { telegramChatId } = params;

    console.log(
      "[POST /api/telegram-thread/:telegramChatId/send-text] Called for chat ID:",
      telegramChatId,
    );

    // Validate chat ID
    const validation = validateTelegramChatId(telegramChatId);
    if (!validation.valid) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-text] Validation failed:",
        validation.error,
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const {
      text,
      omitSignature = false,
      // "separate" posts the signature as its own follow-up message instead of
      // appending it. Used for messages whose body must stay tappable/copyable
      // verbatim — a video-call invite link with "-- Dr. Name" glued to the end
      // forces the patient to copy and edit the message rather than tap it.
      signatureMode = "inline",
      originalMessage,
      // Extra messages posted between the body and the signature. The
      // prescription send uses this to deliver an access code as a message
      // containing nothing but the digits.
      followUps,
    } = body as {
      text?: string;
      omitSignature?: boolean;
      signatureMode?: SignatureMode;
      originalMessage?: string;
      followUps?: string[];
    };

    // Validate required fields
    const fieldValidation = validateRequiredFields({ text }, ["text"]);
    if (!fieldValidation.valid) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-text] Missing required fields:",
        fieldValidation.error,
      );
      return NextResponse.json(
        { error: fieldValidation.error },
        { status: 400 },
      );
    }

    if (typeof text !== "string") {
      return NextResponse.json(
        { error: "text must be a string" },
        { status: 400 },
      );
    }

    if (
      followUps !== undefined &&
      (!Array.isArray(followUps) ||
        followUps.some((entry) => typeof entry !== "string"))
    ) {
      return NextResponse.json(
        { error: "followUps must be an array of strings" },
        { status: 400 },
      );
    }

    // Check if thread exists
    const thread = await getTelegramThreadByChatId(telegramChatId);
    if (!thread) {
      console.error(
        `[POST /api/telegram-thread/:telegramChatId/send-text] Thread not found for chat ID: ${telegramChatId}`,
      );
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Signed as the account, not as anything the client claimed.
    const { senderName, senderId } = await resolveSenderIdentity(session);

    console.log(
      `[POST /api/telegram-thread/:telegramChatId/send-text] Sending message to Telegram chat ${telegramChatId}`,
    );

    const { telegramResponse, savedMessage } = await sendTelegramText({
      chatId: telegramChatId,
      text,
      senderName,
      senderId,
      omitSignature,
      signatureMode,
      originalMessage,
      followUps,
    });

    console.log(
      `[POST /api/telegram-thread/:telegramChatId/send-text] Message sent to Telegram successfully`,
    );

    return NextResponse.json({
      success: true,
      message: "Message sent to Telegram and saved successfully",
      telegramResponse,
      savedMessage: {
        id: savedMessage.id,
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        timestamp: savedMessage.timestamp,
        type: savedMessage.type,
        ...(savedMessage.originalMessage
          ? { originalMessage: savedMessage.originalMessage }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof TelegramNotConfiguredError) {
      console.error(
        "[POST /api/telegram-thread/:telegramChatId/send-text] Telegram bot token is missing",
      );
      return NextResponse.json(
        { error: "Telegram bot token is not configured" },
        { status: 500 },
      );
    }

    console.error(
      "[POST /api/telegram-thread/:telegramChatId/send-text] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
