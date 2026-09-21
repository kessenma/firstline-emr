// lib/telegram-db-helpers.ts
/**
 * Database helper utilities for Telegram API endpoints
 * Provides reusable query functions for common Telegram operations
 */

import { db } from "@/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  telegramThreads,
  telegramThreadParticipants,
  patientFollowUps,
  telegramIntakeTokens,
  telegramMessages,
  telegramLinkCodes,
  pendingLinkAttempts,
  TelegramThread,
  TelegramMessage,
  NewTelegramThread,
  NewPatientFollowUp,
  NewTelegramIntakeToken,
  TelegramMessageRow,
} from "@/db/schema";
import { patients } from "@/db/schema";
import { users } from "@/db/schema";
import crypto from "crypto";

/**
 * Get a Telegram thread by chat ID
 * @param chatId - Telegram chat ID
 * @returns Thread object or null if not found
 */
export async function getTelegramThreadByChatId(
  chatId: string,
): Promise<TelegramThread | null> {
  try {
    const [thread] = await db
      .select()
      .from(telegramThreads)
      .where(eq(telegramThreads.chatId, chatId))
      .limit(1);

    return thread || null;
  } catch (error) {
    console.error("[getTelegramThreadByChatId] Error:", error);
    throw error;
  }
}

/**
 * Get a Telegram thread by chat ID with patient information
 * @param chatId - Telegram chat ID
 * @returns Thread with patient data or null
 */
export async function getTelegramThreadWithPatient(chatId: string) {
  try {
    const [result] = await db
      .select({
        thread: telegramThreads,
        patient: patients,
      })
      .from(telegramThreads)
      .leftJoin(patients, eq(telegramThreads.patientId, patients.id))
      .where(eq(telegramThreads.chatId, chatId))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error("[getTelegramThreadWithPatient] Error:", error);
    throw error;
  }
}

/**
 * Get a Telegram thread with participants
 * @param chatId - Telegram chat ID
 * @returns Thread with participant user data
 */
export async function getTelegramThreadWithParticipants(chatId: string) {
  try {
    const [thread] = await db
      .select()
      .from(telegramThreads)
      .where(eq(telegramThreads.chatId, chatId))
      .limit(1);

    if (!thread) return null;

    // Get participants
    const participantRecords = await db
      .select({
        participant: telegramThreadParticipants,
        user: users,
      })
      .from(telegramThreadParticipants)
      .leftJoin(users, eq(telegramThreadParticipants.userId, users.id))
      .where(eq(telegramThreadParticipants.threadId, thread.id));

    return {
      ...thread,
      participantData: participantRecords.map((r) => r.user).filter(Boolean),
    };
  } catch (error) {
    console.error("[getTelegramThreadWithParticipants] Error:", error);
    throw error;
  }
}

/**
 * Create a new Telegram thread
 * @param data - Thread data
 * @returns Created thread
 */
export async function createTelegramThread(data: NewTelegramThread) {
  try {
    const [thread] = await db.insert(telegramThreads).values(data).returning();

    return thread;
  } catch (error) {
    console.error("[createTelegramThread] Error:", error);
    throw error;
  }
}

/**
 * Update a Telegram thread
 * @param chatId - Telegram chat ID
 * @param data - Partial thread data to update
 * @returns Updated thread
 */
export async function updateTelegramThread(
  chatId: string,
  data: Partial<TelegramThread>,
) {
  try {
    const [updated] = await db
      .update(telegramThreads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[updateTelegramThread] Error:", error);
    throw error;
  }
}

/**
 * Delete a Telegram thread by chat ID
 * @param chatId - Telegram chat ID
 * @returns Deleted thread or null
 */
export async function deleteTelegramThread(chatId: string) {
  try {
    const [deleted] = await db
      .delete(telegramThreads)
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return deleted || null;
  } catch (error) {
    console.error("[deleteTelegramThread] Error:", error);
    throw error;
  }
}

/**
 * Get unread count for a Telegram thread
 * @param chatId - Telegram chat ID
 * @returns Unread count or 0
 */
export async function getUnreadCount(chatId: string): Promise<number> {
  try {
    const [thread] = await db
      .select({ unreadCount: telegramThreads.unreadCount })
      .from(telegramThreads)
      .where(eq(telegramThreads.chatId, chatId))
      .limit(1);

    return thread?.unreadCount ?? 0;
  } catch (error) {
    console.error("[getUnreadCount] Error:", error);
    return 0;
  }
}

/**
 * Get unread message counts for multiple chat IDs in a single query
 * More efficient than calling getUnreadCount() multiple times
 * @param chatIds - Array of Telegram chat IDs
 * @returns Map of chatId -> unread count
 */
export async function getBatchUnreadCounts(
  chatIds: string[],
): Promise<Record<string, number>> {
  try {
    if (!chatIds || chatIds.length === 0) {
      return {};
    }

    // Remove duplicates
    const uniqueChatIds = [...new Set(chatIds)];

    console.log(
      `[getBatchUnreadCounts] Fetching unread counts for ${uniqueChatIds.length} chat IDs`,
    );

    // Fetch all unread counts in a single query using IN clause
    const threads = await db
      .select({
        chatId: telegramThreads.chatId,
        unreadCount: telegramThreads.unreadCount,
      })
      .from(telegramThreads)
      .where(inArray(telegramThreads.chatId, uniqueChatIds));

    // Convert to map for O(1) lookup
    const unreadMap: Record<string, number> = {};
    threads.forEach((thread) => {
      unreadMap[thread.chatId] = thread.unreadCount ?? 0;
    });

    // Fill in 0 for chat IDs not found
    uniqueChatIds.forEach((chatId) => {
      if (!(chatId in unreadMap)) {
        unreadMap[chatId] = 0;
      }
    });

    console.log(
      `[getBatchUnreadCounts] Found ${threads.length} threads with messages`,
    );

    return unreadMap;
  } catch (error) {
    console.error("[getBatchUnreadCounts] Error:", error);
    // Return empty map on error - graceful degradation
    return {};
  }
}

/**
 * Reset unread count for a Telegram thread
 * @param chatId - Telegram chat ID
 * @returns Updated thread
 */
export async function resetUnreadCount(chatId: string) {
  try {
    const [updated] = await db
      .update(telegramThreads)
      .set({
        unreadCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[resetUnreadCount] Error:", error);
    throw error;
  }
}

/**
 * Increment unread count for a Telegram thread
 * @param chatId - Telegram chat ID
 * @param increment - Amount to increment (default: 1)
 * @returns Updated thread
 */
export async function incrementUnreadCount(
  chatId: string,
  increment: number = 1,
) {
  try {
    const [updated] = await db
      .update(telegramThreads)
      .set({
        unreadCount: sql`${telegramThreads.unreadCount} + ${increment}`,
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[incrementUnreadCount] Error:", error);
    throw error;
  }
}

/**
 * Add a message to a Telegram thread
 * @param chatId - Telegram chat ID
 * @param message - Message object to add
 * @returns Updated thread
 */
export async function addMessageToThread(
  chatId: string,
  message: TelegramMessage,
) {
  try {
    // Get current thread
    const thread = await getTelegramThreadByChatId(chatId);
    if (!thread) {
      throw new Error(`Thread not found for chat ID: ${chatId}`);
    }

    // 1. Primary write: insert into normalized telegram_messages table
    await db.insert(telegramMessages).values({
      id: message.id,
      threadId: thread.id,
      text: message.text || "",
      sender: message.sender,
      senderId: message.senderId || null,
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      type: message.type || "text",
      mediaUrl: message.mediaUrl || "",
      replyTo: message.replyTo || null,
      forwardedFrom: message.forwardedFrom || "",
      deletedAt: message.deletedAt ? new Date(message.deletedAt) : null,
      updatedAt: message.updatedAt ? new Date(message.updatedAt) : null,
      translatedText: message.translatedText || null,
      isTranslated: message.isTranslated || false,
    }).onConflictDoNothing();

    // 2. Backward compat: keep JSON array updated for web clients
    const currentMessages = (thread.messages as TelegramMessage[]) || [];
    const updatedMessages = [...currentMessages, message];

    const [updated] = await db
      .update(telegramThreads)
      .set({
        messages: updatedMessages as any,
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[addMessageToThread] Error:", error);
    throw error;
  }
}

/**
 * Get messages from the normalized telegram_messages table
 * @param threadId - Thread UUID
 * @param limit - Maximum number of messages to return
 * @returns Array of normalized message rows
 */
export async function getThreadMessagesNormalized(
  threadId: string,
  limit?: number,
): Promise<TelegramMessageRow[]> {
  try {
    let query = db
      .select()
      .from(telegramMessages)
      .where(eq(telegramMessages.threadId, threadId))
      .orderBy(telegramMessages.timestamp);

    if (limit) {
      query = query.limit(limit) as any;
    }

    return await query;
  } catch (error) {
    console.error("[getThreadMessagesNormalized] Error:", error);
    throw error;
  }
}

/**
 * Get messages from a Telegram thread (reads from JSON column — legacy)
 * @param chatId - Telegram chat ID
 * @param limit - Maximum number of messages to return
 * @returns Array of messages
 */
export async function getThreadMessages(
  chatId: string,
  limit?: number,
): Promise<TelegramMessage[]> {
  try {
    const [thread] = await db
      .select({ messages: telegramThreads.messages })
      .from(telegramThreads)
      .where(eq(telegramThreads.chatId, chatId))
      .limit(1);

    if (!thread) return [];

    const messages = (thread.messages as TelegramMessage[]) || [];

    // Return limited or all messages
    return limit ? messages.slice(-limit) : messages;
  } catch (error) {
    console.error("[getThreadMessages] Error:", error);
    throw error;
  }
}

/**
 * Add participant to a Telegram thread
 * @param threadId - Thread UUID
 * @param userId - User UUID
 * @returns Created participant record
 */
export async function addThreadParticipant(threadId: string, userId: string) {
  try {
    const [participant] = await db
      .insert(telegramThreadParticipants)
      .values({
        threadId,
        userId,
      })
      .returning();

    return participant;
  } catch (error) {
    console.error("[addThreadParticipant] Error:", error);
    throw error;
  }
}

/**
 * Remove participant from a Telegram thread
 * @param threadId - Thread UUID
 * @param userId - User UUID
 * @returns Deleted participant record
 */
export async function removeThreadParticipant(
  threadId: string,
  userId: string,
) {
  try {
    const [deleted] = await db
      .delete(telegramThreadParticipants)
      .where(
        and(
          eq(telegramThreadParticipants.threadId, threadId),
          eq(telegramThreadParticipants.userId, userId),
        ),
      )
      .returning();

    return deleted || null;
  } catch (error) {
    console.error("[removeThreadParticipant] Error:", error);
    throw error;
  }
}

/**
 * Create a follow-up record
 * @param data - Follow-up data
 * @returns Created follow-up record
 */
export async function createFollowUp(data: NewPatientFollowUp) {
  try {
    const [followUp] = await db
      .insert(patientFollowUps)
      .values(data)
      .returning();

    return followUp;
  } catch (error) {
    console.error("[createFollowUp] Error:", error);
    throw error;
  }
}

/**
 * Get follow-ups for a chat ID
 * @param chatId - Telegram chat ID
 * @param limit - Maximum number of records (default: 10)
 * @returns Array of follow-up records
 */
export async function getFollowUpsByChatId(chatId: string, limit: number = 10) {
  try {
    const followUps = await db
      .select()
      .from(patientFollowUps)
      .where(eq(patientFollowUps.chatId, chatId))
      .orderBy(desc(patientFollowUps.followUpSentAt))
      .limit(limit);

    return followUps;
  } catch (error) {
    console.error("[getFollowUpsByChatId] Error:", error);
    throw error;
  }
}

/**
 * Get all follow-ups due for sending (for CRON jobs)
 * @param beforeDate - Get follow-ups sent before this date
 * @returns Array of follow-up records with thread data
 */
export async function getFollowUpsDue(beforeDate: Date) {
  try {
    const followUps = await db
      .select({
        followUp: patientFollowUps,
        thread: telegramThreads,
      })
      .from(patientFollowUps)
      .leftJoin(
        telegramThreads,
        eq(patientFollowUps.telegramThreadId, telegramThreads.id),
      )
      .where(sql`${patientFollowUps.followUpSentAt} < ${beforeDate}`)
      .orderBy(desc(patientFollowUps.followUpSentAt));

    return followUps;
  } catch (error) {
    console.error("[getFollowUpsDue] Error:", error);
    throw error;
  }
}

/**
 * Create a Telegram intake token
 * @param data - Token data
 * @returns Created token record
 */
export async function createIntakeToken(data: NewTelegramIntakeToken) {
  try {
    const [token] = await db
      .insert(telegramIntakeTokens)
      .values(data)
      .returning();

    return token;
  } catch (error) {
    console.error("[createIntakeToken] Error:", error);
    throw error;
  }
}

/**
 * Get intake token by token string
 * @param token - Token string
 * @returns Token record or null
 */
export async function getIntakeTokenByToken(token: string) {
  try {
    const [tokenRecord] = await db
      .select()
      .from(telegramIntakeTokens)
      .where(eq(telegramIntakeTokens.token, token))
      .limit(1);

    return tokenRecord || null;
  } catch (error) {
    console.error("[getIntakeTokenByToken] Error:", error);
    throw error;
  }
}

/**
 * Get intake token with patient data
 * @param token - Token string
 * @returns Token with patient data or null
 */
export async function getIntakeTokenWithPatient(token: string) {
  try {
    const [result] = await db
      .select({
        token: telegramIntakeTokens,
        patient: patients,
      })
      .from(telegramIntakeTokens)
      .leftJoin(patients, eq(telegramIntakeTokens.patientId, patients.id))
      .where(eq(telegramIntakeTokens.token, token))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error("[getIntakeTokenWithPatient] Error:", error);
    throw error;
  }
}

/**
 * Invalidate an intake token (mark as used)
 * @param token - Token string
 * @returns Updated token record
 */
export async function invalidateIntakeToken(token: string) {
  try {
    const [updated] = await db
      .update(telegramIntakeTokens)
      .set({
        isValid: false,
        submitted: true,
        submittedAt: new Date(),
      })
      .where(eq(telegramIntakeTokens.token, token))
      .returning();

    return updated;
  } catch (error) {
    console.error("[invalidateIntakeToken] Error:", error);
    throw error;
  }
}

/**
 * Check if an intake token is valid
 * @param token - Token string
 * @returns true if valid and not expired, false otherwise
 */
export async function isIntakeTokenValid(token: string): Promise<boolean> {
  try {
    const tokenRecord = await getIntakeTokenByToken(token);

    if (!tokenRecord) return false;
    if (!tokenRecord.isValid) return false;
    if (tokenRecord.submitted) return false;

    // Check expiration
    const now = new Date();
    if (tokenRecord.expiresAt < now) return false;

    return true;
  } catch (error) {
    console.error("[isIntakeTokenValid] Error:", error);
    return false;
  }
}

/**
 * Get all threads for a patient
 * @param patientId - Patient UUID
 * @returns Array of threads
 */
export async function getThreadsByPatientId(patientId: string) {
  try {
    const threads = await db
      .select()
      .from(telegramThreads)
      .where(eq(telegramThreads.patientId, patientId))
      .orderBy(desc(telegramThreads.updatedAt));

    return threads;
  } catch (error) {
    console.error("[getThreadsByPatientId] Error:", error);
    throw error;
  }
}

/**
 * Get thread count for statistics
 * @param status - Optional status filter
 * @returns Total thread count
 */
export async function getTelegramThreadCount(status?: "active" | "archived") {
  try {
    const query = status
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(telegramThreads)
          .where(eq(telegramThreads.status, status))
      : db.select({ count: sql<number>`count(*)` }).from(telegramThreads);

    const [result] = await query;
    return result?.count || 0;
  } catch (error) {
    console.error("[getTelegramThreadCount] Error:", error);
    throw error;
  }
}

/**
 * Archive a Telegram thread
 * @param chatId - Telegram chat ID
 * @returns Updated thread
 */
export async function archiveTelegramThread(chatId: string) {
  try {
    const [updated] = await db
      .update(telegramThreads)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[archiveTelegramThread] Error:", error);
    throw error;
  }
}

/**
 * Reactivate an archived Telegram thread
 * @param chatId - Telegram chat ID
 * @returns Updated thread
 */
export async function reactivateTelegramThread(chatId: string) {
  try {
    const [updated] = await db
      .update(telegramThreads)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(telegramThreads.chatId, chatId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[reactivateTelegramThread] Error:", error);
    throw error;
  }
}

// ============================================================================
// PATIENT OPERATIONS
// ============================================================================

/**
 * Get patient by Telegram chat ID
 * @param telegramChatId - Telegram chat ID
 * @returns Patient record or null
 */
export async function getPatientByTelegramChatId(telegramChatId: string) {
  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.telegramChatId, telegramChatId))
      .limit(1);

    return patient || null;
  } catch (error) {
    console.error("[getPatientByTelegramChatId] Error:", error);
    throw error;
  }
}

/**
 * Get patient by ID
 * @param patientId - Patient UUID
 * @returns Patient record or null
 */
export async function getPatientById(patientId: string) {
  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    return patient || null;
  } catch (error) {
    console.error("[getPatientById] Error:", error);
    throw error;
  }
}

/**
 * Create a new patient
 * @param data - Patient data (must include at least telegramChatId)
 * @returns Created patient record
 */
export async function createPatient(data: {
  telegramChatId: string;
  language?: string;
  hasSubmittedInfo?: boolean;
  [key: string]: any;
}) {
  try {
    const { telegramChatId, language, hasSubmittedInfo, ...rest } = data;
    const [patient] = await db
      .insert(patients)
      .values({
        telegramChatId,
        language: language || "en",
        hasSubmittedInfo: hasSubmittedInfo || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...rest,
      })
      .returning();

    return patient;
  } catch (error) {
    console.error("[createPatient] Error:", error);
    throw error;
  }
}

/**
 * Update patient by ID
 * @param patientId - Patient UUID
 * @param data - Partial patient data to update
 * @returns Updated patient record
 */
export async function updatePatientById(
  patientId: string,
  data: Record<string, any>,
) {
  try {
    // Fields that should never be updated via this function
    const immutableFields = ["id", "createdAt", "updatedAt"];

    // Date fields that need to be converted from strings to Date objects
    const dateFields = ["dob", "scheduledVidChat", "surgeryDate"];

    const processedData = { ...data };

    // Remove immutable fields
    for (const field of immutableFields) {
      delete processedData[field];
    }

    // Convert date string fields to Date objects
    for (const field of dateFields) {
      if (field in processedData && processedData[field] !== null) {
        const value = processedData[field];
        // Convert string to Date if it's not already a Date
        if (typeof value === "string" && value.trim() !== "") {
          processedData[field] = new Date(value);
        } else if (!(value instanceof Date)) {
          // If it's not a valid date value, remove it to avoid errors
          delete processedData[field];
        }
      }
    }

    const [updated] = await db
      .update(patients)
      .set({
        ...processedData,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patientId))
      .returning();

    return updated;
  } catch (error) {
    console.error("[updatePatientById] Error:", error);
    throw error;
  }
}

// ============================================================================
// INTAKE TOKEN OPERATIONS (Enhanced)
// ============================================================================

/**
 * Generate a secure random token string
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate and save a new intake token
 * @param patientId - Patient UUID
 * @param telegramChatId - Telegram chat ID
 * @param expirationDays - Days until expiration (default: 36500 = ~100 years)
 * @returns Token string
 */
export async function generateIntakeToken(
  patientId: string,
  telegramChatId: string,
  expirationDays: number = 36500,
): Promise<string> {
  try {
    // Generate secure random token
    const tokenString = generateSecureToken(32);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create token record
    await db.insert(telegramIntakeTokens).values({
      token: tokenString,
      patientId,
      telegramChatId,
      expiresAt,
      isValid: true,
      submitted: false,
      submittedAt: null,
      createdAt: new Date(),
    });

    return tokenString;
  } catch (error) {
    console.error("[generateIntakeToken] Error:", error);
    throw error;
  }
}

/**
 * Find existing valid token for a patient
 * @param patientId - Patient UUID
 * @param telegramChatId - Telegram chat ID
 * @returns Token record or null
 */
export async function findExistingValidToken(
  patientId: string,
  telegramChatId: string,
) {
  try {
    const now = new Date();
    const [tokenRecord] = await db
      .select()
      .from(telegramIntakeTokens)
      .where(
        and(
          eq(telegramIntakeTokens.patientId, patientId),
          eq(telegramIntakeTokens.telegramChatId, telegramChatId),
          eq(telegramIntakeTokens.isValid, true),
          sql`${telegramIntakeTokens.expiresAt} > ${now}`,
        ),
      )
      .limit(1);

    return tokenRecord || null;
  } catch (error) {
    console.error("[findExistingValidToken] Error:", error);
    throw error;
  }
}

/**
 * Validate an intake token and return its data
 * @param token - Token string
 * @returns Token data with validation result or null if invalid
 */
export async function validateIntakeToken(token: string): Promise<{
  patientId: string;
  telegramChatId: string;
  submitted: boolean;
} | null> {
  try {
    const tokenRecord = await getIntakeTokenByToken(token);

    if (!tokenRecord) {
      console.log("[validateIntakeToken] Token not found");
      return null;
    }

    if (!tokenRecord.isValid) {
      console.log("[validateIntakeToken] Token is not valid");
      return null;
    }

    // Check expiration
    const now = new Date();
    if (tokenRecord.expiresAt < now) {
      console.log("[validateIntakeToken] Token is expired");
      // Mark as invalid
      await db
        .update(telegramIntakeTokens)
        .set({ isValid: false })
        .where(eq(telegramIntakeTokens.token, token));
      return null;
    }

    return {
      patientId: tokenRecord.patientId,
      telegramChatId: tokenRecord.telegramChatId,
      submitted: tokenRecord.submitted,
    };
  } catch (error) {
    console.error("[validateIntakeToken] Error:", error);
    return null;
  }
}

/**
 * Mark an intake token as submitted
 * @param token - Token string
 * @returns Updated token record or null if not found
 */
export async function markTokenAsSubmitted(token: string) {
  try {
    const [updated] = await db
      .update(telegramIntakeTokens)
      .set({
        submitted: true,
        submittedAt: new Date(),
      })
      .where(eq(telegramIntakeTokens.token, token))
      .returning();

    return updated || null;
  } catch (error) {
    console.error("[markTokenAsSubmitted] Error:", error);
    throw error;
  }
}

// ===== TELEGRAM LINK CODES =====

const LINK_CODE_LENGTH = 6;

// Latin alphabet: A-Z minus O and I, digits 2-9 (no 0/1)
const LATIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Arabic-script alphabet: visually distinct isolated-form letters + Arabic-Indic numerals
// Letters chosen for visual distinctiveness in isolation:
// ب ت ج د ر س ع ف ك ل م ن ه (13 letters)
// Arabic-Indic digits: ٢٣٤٥٦٧٨٩ (8 digits, no ٠/١ to avoid ambiguity)
const ARABIC_ALPHABET = "بتجدرسعفكلمنه٢٣٤٥٦٧٨٩";

// Map of language → alphabet
const SCRIPT_ALPHABETS: Record<string, string> = {
  arabic: ARABIC_ALPHABET,
  farsi: ARABIC_ALPHABET,
  pashto: ARABIC_ALPHABET,
  urdu: ARABIC_ALPHABET,
};

/**
 * Get the appropriate alphabet for a patient's language
 */
export function getAlphabetForLanguage(language?: string | null): string {
  if (!language) return LATIN_ALPHABET;
  return SCRIPT_ALPHABETS[language.toLowerCase()] || LATIN_ALPHABET;
}

/**
 * Check if a string looks like a valid link code (any supported alphabet)
 */
export function isValidLinkCode(text: string): boolean {
  if (text.length !== LINK_CODE_LENGTH) return false;
  // Check if all chars are from Latin or Arabic alphabet
  const allChars = LATIN_ALPHABET + ARABIC_ALPHABET;
  return [...text].every((ch) => allChars.includes(ch));
}

/**
 * Generate a short, human-readable link code in the appropriate script
 * @param language - Patient's language (e.g., "Arabic", "English")
 */
export function generateShortCode(language?: string | null): string {
  const alphabet = getAlphabetForLanguage(language);
  const chars = [...alphabet]; // Spread to handle multi-byte Arabic chars correctly
  const bytes = crypto.randomBytes(LINK_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Get an active (unused, unexpired) link code for a patient
 */
export async function getActiveLinkCode(patientId: string) {
  try {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(telegramLinkCodes)
      .where(
        and(
          eq(telegramLinkCodes.patientId, patientId),
          eq(telegramLinkCodes.isUsed, false),
          sql`${telegramLinkCodes.expiresAt} > ${now}`,
        ),
      )
      .limit(1);

    return existing || null;
  } catch (error) {
    console.error("[getActiveLinkCode] Error:", error);
    throw error;
  }
}

/**
 * Generate and save a new link code for a patient
 * Returns existing active code if one exists
 */
export async function generateLinkCode(
  patientId: string,
  createdById: string,
  language?: string | null,
): Promise<{ code: string; expiresAt: Date; isExisting: boolean }> {
  try {
    // Check for existing active code
    const existing = await getActiveLinkCode(patientId);
    if (existing) {
      return {
        code: existing.code,
        expiresAt: existing.expiresAt,
        isExisting: true,
      };
    }

    // Generate new code (retry on collision)
    let code: string;
    let attempts = 0;
    do {
      code = generateShortCode(language);
      attempts++;
      const [collision] = await db
        .select({ id: telegramLinkCodes.id })
        .from(telegramLinkCodes)
        .where(eq(telegramLinkCodes.code, code))
        .limit(1);
      if (!collision) break;
    } while (attempts < 5);

    if (attempts >= 5) {
      throw new Error("Failed to generate unique link code after 5 attempts");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(telegramLinkCodes).values({
      code,
      patientId,
      createdById,
      expiresAt,
      isUsed: false,
      createdAt: new Date(),
    });

    // Check if there are pending link attempts for this code
    const pendingAttempt = await findPendingAttemptByCode(code);
    if (pendingAttempt) {
      // Auto-resolve: link the patient to the Telegram account
      await redeemLinkCode(code, pendingAttempt.telegramChatId);
      await db
        .update(pendingLinkAttempts)
        .set({ status: "matched", resolvedAt: new Date() })
        .where(eq(pendingLinkAttempts.id, pendingAttempt.id));
    }

    return { code, expiresAt, isExisting: false };
  } catch (error) {
    console.error("[generateLinkCode] Error:", error);
    throw error;
  }
}

/**
 * Redeem a link code — links a patient to a Telegram chat ID
 * Returns the patient info on success, null if code is invalid
 */
export async function redeemLinkCode(
  code: string,
  telegramChatId: string,
): Promise<{
  patientId: string;
  patientName: string;
  patientLanguage: string | null;
  createdById: string | null;
  skipIntake: boolean;
} | null> {
  try {
    const now = new Date();

    // Look up the code
    const [linkCode] = await db
      .select()
      .from(telegramLinkCodes)
      .where(
        and(
          eq(telegramLinkCodes.code, code.toUpperCase()),
          eq(telegramLinkCodes.isUsed, false),
          sql`${telegramLinkCodes.expiresAt} > ${now}`,
        ),
      )
      .limit(1);

    if (!linkCode) {
      return null;
    }

    // Check if this chatId is already linked to another patient
    const [existingPatient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.telegramChatId, telegramChatId))
      .limit(1);

    if (existingPatient) {
      console.log(
        `[redeemLinkCode] Chat ${telegramChatId} already linked to patient ${existingPatient.id}`,
      );
      return null;
    }

    // Update patient with telegramChatId
    const [updatedPatient] = await db
      .update(patients)
      .set({
        telegramChatId,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, linkCode.patientId))
      .returning();

    if (!updatedPatient) {
      console.error("[redeemLinkCode] Patient not found:", linkCode.patientId);
      return null;
    }

    // Mark code as used
    await db
      .update(telegramLinkCodes)
      .set({
        isUsed: true,
        usedAt: new Date(),
        telegramChatId,
      })
      .where(eq(telegramLinkCodes.id, linkCode.id));

    // Create telegram thread for this patient
    const existingThread = await getTelegramThreadByChatId(telegramChatId);
    if (!existingThread) {
      await createTelegramThread({
        chatId: telegramChatId,
        patientId: linkCode.patientId,
        messages: [],
        status: "active",
        unreadCount: 0,
      });
    }

    const patientName =
      [updatedPatient.firstName, updatedPatient.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown Patient";

    return {
      patientId: linkCode.patientId,
      patientName,
      patientLanguage: updatedPatient.language || null,
      createdById: linkCode.createdById,
      skipIntake: updatedPatient.hasSubmittedInfo === true,
    };
  } catch (error) {
    console.error("[redeemLinkCode] Error:", error);
    throw error;
  }
}

/**
 * Create a pending link attempt (when patient sends code before doctor syncs)
 */
export async function createPendingLinkAttempt(
  code: string,
  telegramChatId: string,
): Promise<void> {
  try {
    // Check if there's already a pending attempt for this code
    const [existing] = await db
      .select()
      .from(pendingLinkAttempts)
      .where(
        and(
          eq(pendingLinkAttempts.code, code.toUpperCase()),
          eq(pendingLinkAttempts.status, "pending"),
        ),
      )
      .limit(1);

    if (existing) {
      // Already a pending attempt for this code — reject duplicates
      return;
    }

    await db.insert(pendingLinkAttempts).values({
      code: code.toUpperCase(),
      telegramChatId,
      status: "pending",
      attemptedAt: new Date(),
    });
  } catch (error) {
    console.error("[createPendingLinkAttempt] Error:", error);
    throw error;
  }
}

/**
 * Find a pending link attempt by code
 */
export async function findPendingAttemptByCode(code: string) {
  try {
    const [attempt] = await db
      .select()
      .from(pendingLinkAttempts)
      .where(
        and(
          eq(pendingLinkAttempts.code, code.toUpperCase()),
          eq(pendingLinkAttempts.status, "pending"),
        ),
      )
      .limit(1);

    return attempt || null;
  } catch (error) {
    console.error("[findPendingAttemptByCode] Error:", error);
    throw error;
  }
}
