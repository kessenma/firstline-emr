// lib/patient-messages-helpers.ts
import { db } from '@/db';
import {
  telegramThreads,
  telegramThreadParticipants,
  userMessages,
  users,
  type TelegramThread,
  type TelegramMessage,
  type NewTelegramThread,
} from '@/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get telegram threads for a user
 */
export async function getTelegramThreadsForUser(
  userId: string,
  limit: number = 20
): Promise<TelegramThread[]> {
  const threads = await db
    .select()
    .from(telegramThreads)
    .where(
      and(
        sql`${userId} = ANY(${telegramThreads.participants})`,
        eq(telegramThreads.status, 'active')
      )
    )
    .orderBy(desc(telegramThreads.updatedAt))
    .limit(limit);

  return threads;
}

/**
 * Get telegram thread by ID with participant check
 */
export async function getTelegramThreadById(
  threadId: string,
  userId: string
): Promise<TelegramThread | null> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.id, threadId))
    .limit(1);

  if (!thread) {
    return null;
  }

  // Check if user is a participant
  const isParticipant = thread.participants?.includes(userId) || false;
  if (!isParticipant) {
    return null;
  }

  return thread;
}

/**
 * Get telegram thread by chat ID
 */
export async function getTelegramThreadByChatId(
  chatId: string
): Promise<TelegramThread | null> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.chatId, chatId))
    .limit(1);

  return thread || null;
}

/**
 * Create or update telegram thread
 */
export async function createOrUpdateTelegramThread(
  chatId: string,
  data: {
    patientId?: string | null;
    participants?: string[];
    status?: 'active' | 'archived';
  }
): Promise<TelegramThread> {
  // Check if thread exists
  const existing = await getTelegramThreadByChatId(chatId);

  if (existing) {
    // Update existing thread
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.patientId !== undefined) {
      updateData.patientId = data.patientId;
    }

    if (data.participants !== undefined) {
      // Merge participants
      const existingParticipants = existing.participants || [];
      const newParticipants = Array.from(
        new Set([...existingParticipants, ...data.participants])
      );
      updateData.participants = newParticipants;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const [updated] = await db
      .update(telegramThreads)
      .set(updateData)
      .where(eq(telegramThreads.id, existing.id))
      .returning();

    return updated;
  }

  // Create new thread
  const [newThread] = await db
    .insert(telegramThreads)
    .values({
      chatId,
      patientId: data.patientId || null,
      participants: data.participants || [],
      status: data.status || 'active',
      unreadCount: 0,
      messages: [],
    })
    .returning();

  return newThread;
}

/**
 * Add message to telegram thread
 */
export async function addMessageToTelegramThread(
  threadId: string,
  message: {
    text: string;
    sender: string;
    senderId: string | null;
    type?: 'text' | 'image' | 'video' | 'file' | 'reply' | 'forward' | 'audio';
    mediaUrl?: string;
    replyTo?: string;
    forwardedFrom?: string;
  }
): Promise<TelegramMessage> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error('Thread not found');
  }

  const newMessage: TelegramMessage = {
    id: uuidv4(),
    text: message.text || '',
    sender: message.sender,
    senderId: message.senderId,
    timestamp: new Date(),
    type: message.type || 'text',
    mediaUrl: message.mediaUrl || '',
    replyTo: message.replyTo,
    forwardedFrom: message.forwardedFrom || '',
    deletedAt: null,
    updatedAt: null,
  };

  const currentMessages = (thread.messages as TelegramMessage[]) || [];
  const updatedMessages = [...currentMessages, newMessage];

  await db
    .update(telegramThreads)
    .set({
      messages: updatedMessages,
      unreadCount: (thread.unreadCount || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(telegramThreads.id, threadId));

  return newMessage;
}

/**
 * Mark telegram thread as read
 */
export async function markTelegramThreadAsRead(
  threadId: string,
  userId: string
): Promise<{ success: boolean; previousUnread: number }> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error('Thread not found');
  }

  // Check if user is a participant
  const isParticipant = thread.participants?.includes(userId) || false;
  if (!isParticipant) {
    throw new Error('Unauthorized: Not a participant in this thread');
  }

  const previousUnread = thread.unreadCount || 0;

  // Update thread unread count
  await db
    .update(telegramThreads)
    .set({
      unreadCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(telegramThreads.id, threadId));

  // Update user's total unread count
  const [userMessage] = await db
    .select()
    .from(userMessages)
    .where(eq(userMessages.userId, userId))
    .limit(1);

  if (userMessage) {
    const newUnreadCount = Math.max(0, userMessage.unreadCount - previousUnread);
    await db
      .update(userMessages)
      .set({
        unreadCount: newUnreadCount,
        updatedAt: new Date(),
      })
      .where(eq(userMessages.userId, userId));
  }

  return { success: true, previousUnread };
}

/**
 * Get or create user messages record
 */
export async function getOrCreateUserMessages(userId: string) {
  const [existing] = await db
    .select()
    .from(userMessages)
    .where(eq(userMessages.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [newRecord] = await db
    .insert(userMessages)
    .values({
      userId,
      unreadCount: 0,
      lastReadAt: new Date(),
    })
    .returning();

  return newRecord;
}

/**
 * Get total unread count for user
 */
export async function getTotalUnreadCountForUser(userId: string): Promise<number> {
  const [result] = await db
    .select()
    .from(userMessages)
    .where(eq(userMessages.userId, userId))
    .limit(1);

  return result?.unreadCount || 0;
}

/**
 * Increment user's total unread count
 */
export async function incrementUserUnreadCount(userId: string, incrementBy: number = 1): Promise<void> {
  const userMessage = await getOrCreateUserMessages(userId);

  await db
    .update(userMessages)
    .set({
      unreadCount: (userMessage.unreadCount || 0) + incrementBy,
      updatedAt: new Date(),
    })
    .where(eq(userMessages.userId, userId));
}

/**
 * Decrement user's total unread count
 */
export async function decrementUserUnreadCount(userId: string, decrementBy: number = 1): Promise<void> {
  const userMessage = await getOrCreateUserMessages(userId);

  await db
    .update(userMessages)
    .set({
      unreadCount: Math.max(0, (userMessage.unreadCount || 0) - decrementBy),
      updatedAt: new Date(),
    })
    .where(eq(userMessages.userId, userId));
}

/**
 * Add participant to telegram thread
 */
export async function addParticipantToTelegramThread(
  threadId: string,
  userId: string
): Promise<void> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error('Thread not found');
  }

  const currentParticipants = thread.participants || [];
  if (currentParticipants.includes(userId)) {
    return; // Already a participant
  }

  const updatedParticipants = [...currentParticipants, userId];

  await db
    .update(telegramThreads)
    .set({
      participants: updatedParticipants,
      updatedAt: new Date(),
    })
    .where(eq(telegramThreads.id, threadId));
}

/**
 * Remove participant from telegram thread
 */
export async function removeParticipantFromTelegramThread(
  threadId: string,
  userId: string
): Promise<void> {
  const [thread] = await db
    .select()
    .from(telegramThreads)
    .where(eq(telegramThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error('Thread not found');
  }

  const currentParticipants = thread.participants || [];
  const updatedParticipants = currentParticipants.filter((id) => id !== userId);

  await db
    .update(telegramThreads)
    .set({
      participants: updatedParticipants,
      updatedAt: new Date(),
    })
    .where(eq(telegramThreads.id, threadId));
}

/**
 * Archive telegram thread
 */
export async function archiveTelegramThread(threadId: string): Promise<void> {
  await db
    .update(telegramThreads)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(telegramThreads.id, threadId));
}

/**
 * Unarchive telegram thread
 */
export async function unarchiveTelegramThread(threadId: string): Promise<void> {
  await db
    .update(telegramThreads)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(telegramThreads.id, threadId));
}
