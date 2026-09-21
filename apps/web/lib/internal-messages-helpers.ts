// lib/internal-messages-helpers.ts
import { db } from "@/db";
import {
  internalMessageThreads,
  internalMessageThreadParticipants,
  internalMessages,
  users,
  userSettings,
  type InternalMessageThread,
  type InternalMessage,
  type NewInternalMessageThread,
} from "@/db/schema";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Utility: Slugify a title
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s:-]/g, "")
    .replace(/specialty:\s*/i, "specialty-")
    .replace(/\s+/g, "-");
}

/**
 * Utility: Convert slug back to title
 */
export function titleFromSlug(slug: string): string | null {
  if (!slug) return null;
  if (slug === "all-doctors") return "All Doctors";
  if (slug === "all-triage") return "All Triage";
  if (slug === "all-triage-and-doctors") return "All Triage and Doctors";
  if (slug.startsWith("specialty-")) {
    const spec = slug.replace(/^specialty-/, "").replace(/-/g, " ");
    const proper = spec.replace(/\b\w/g, (c) => c.toUpperCase());
    return `Specialty: ${proper}`;
  }
  return null;
}

/**
 * Deduplicate user IDs
 */
function dedupeUserIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Sync participants array to the junction table for a thread.
 * This is critical for PowerSync sync rules which query the junction table
 * to determine which threads to sync to each user's device.
 */
async function syncParticipantsToJunctionTable(
  threadId: string,
  participantIds: string[],
): Promise<void> {
  const uniqueIds = dedupeUserIds(participantIds);

  // Get existing junction table entries (including those who left)
  const existing = await db
    .select({
      userId: internalMessageThreadParticipants.userId,
      leftAt: internalMessageThreadParticipants.leftAt,
    })
    .from(internalMessageThreadParticipants)
    .where(eq(internalMessageThreadParticipants.threadId, threadId));

  const existingMap = new Map(existing.map((e) => [e.userId, e]));

  // Insert truly new participants
  const toInsert = uniqueIds.filter((id) => !existingMap.has(id));
  if (toInsert.length > 0) {
    await db.insert(internalMessageThreadParticipants).values(
      toInsert.map((userId) => ({
        threadId,
        userId,
        unreadCount: 0,
        joinedAt: new Date(),
      })),
    );
  }

  // Re-activate participants who had left (clear leftAt, reset joinedAt)
  const toReactivate = uniqueIds.filter((id) => {
    const e = existingMap.get(id);
    return e && e.leftAt !== null;
  });
  if (toReactivate.length > 0) {
    await db
      .update(internalMessageThreadParticipants)
      .set({ leftAt: null, joinedAt: new Date(), unreadCount: 0 })
      .where(
        and(
          eq(internalMessageThreadParticipants.threadId, threadId),
          inArray(internalMessageThreadParticipants.userId, toReactivate),
        ),
      );
  }
}

/**
 * Get or create internal message thread by title
 */
export async function getOrCreateInternalThreadByTitle(
  title: string,
  participantIds: string[],
  createdBy: string,
  isGroupChat: boolean = true,
): Promise<InternalMessageThread> {
  // Check if thread exists
  const [existing] = await db
    .select()
    .from(internalMessageThreads)
    .where(
      and(
        eq(internalMessageThreads.title, title),
        eq(internalMessageThreads.isGroupChat, isGroupChat),
      ),
    )
    .limit(1);

  if (existing) {
    // Update participants if needed
    const existingParticipants = new Set(existing.participants || []);
    const newParticipants = dedupeUserIds([
      ...existing.participants,
      ...participantIds,
    ]);

    const needsUpdate = newParticipants.some(
      (p) => !existingParticipants.has(p),
    );

    if (needsUpdate) {
      const [updated] = await db
        .update(internalMessageThreads)
        .set({
          participants: newParticipants,
          updatedAt: new Date(),
        })
        .where(eq(internalMessageThreads.id, existing.id))
        .returning();

      // Sync junction table with updated participants
      await syncParticipantsToJunctionTable(existing.id, newParticipants);
      return updated;
    }

    // Ensure junction table is in sync even if participants didn't change
    await syncParticipantsToJunctionTable(existing.id, existing.participants || []);
    return existing;
  }

  // Create new thread
  const dedupedParticipants = dedupeUserIds(participantIds);
  const [newThread] = await db
    .insert(internalMessageThreads)
    .values({
      title,
      participants: dedupedParticipants,
      isGroupChat,
      createdBy,
      messages: [],
      unreadCount: 0,
      status: "active",
      lastActivity: new Date(),
    })
    .returning();

  // Populate junction table for PowerSync sync
  await syncParticipantsToJunctionTable(newThread.id, dedupedParticipants);

  return newThread;
}

/**
 * Get internal message threads for a user (groups only, per-user unread via junction table)
 */
export async function getInternalThreadsForUser(
  userId: string,
  limit: number = 50,
): Promise<(InternalMessageThread & { userUnreadCount: number })[]> {
  const threads = await db
    .select({
      id: internalMessageThreads.id,
      title: internalMessageThreads.title,
      participants: internalMessageThreads.participants,
      unreadCount: internalMessageThreads.unreadCount,
      status: internalMessageThreads.status,
      messages: internalMessageThreads.messages,
      lastActivity: internalMessageThreads.lastActivity,
      createdBy: internalMessageThreads.createdBy,
      isGroupChat: internalMessageThreads.isGroupChat,
      createdAt: internalMessageThreads.createdAt,
      updatedAt: internalMessageThreads.updatedAt,
      userUnreadCount: internalMessageThreadParticipants.unreadCount,
    })
    .from(internalMessageThreads)
    .innerJoin(
      internalMessageThreadParticipants,
      and(
        eq(internalMessageThreadParticipants.threadId, internalMessageThreads.id),
        eq(internalMessageThreadParticipants.userId, userId),
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    )
    .where(eq(internalMessageThreads.isGroupChat, true))
    .orderBy(desc(internalMessageThreads.lastActivity))
    .limit(limit);

  return threads;
}

/**
 * Get internal thread by ID with active membership check via junction table
 */
export async function getInternalThreadById(
  threadId: string,
  userId: string,
): Promise<InternalMessageThread | null> {
  const [thread] = await db
    .select()
    .from(internalMessageThreads)
    .where(eq(internalMessageThreads.id, threadId))
    .limit(1);

  if (!thread) {
    return null;
  }

  // Check junction table for active membership
  const [membership] = await db
    .select()
    .from(internalMessageThreadParticipants)
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, threadId),
        eq(internalMessageThreadParticipants.userId, userId),
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return thread;
}

/**
 * Get internal thread by slug with participant check
 */
export async function getInternalThreadBySlug(
  slug: string,
  userId: string,
): Promise<InternalMessageThread | null> {
  const title = titleFromSlug(slug);
  if (!title) {
    return null;
  }

  const [thread] = await db
    .select()
    .from(internalMessageThreads)
    .where(
      and(
        eq(internalMessageThreads.title, title),
        eq(internalMessageThreads.isGroupChat, true),
      ),
    )
    .limit(1);

  if (!thread) {
    return null;
  }

  // Check junction table for active membership
  const [membership] = await db
    .select()
    .from(internalMessageThreadParticipants)
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, thread.id),
        eq(internalMessageThreadParticipants.userId, userId),
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return thread;
}

/**
 * Add message to internal thread
 */
export async function addMessageToInternalThread(
  threadId: string,
  message: {
    text: string;
    sender: string;
    senderId: string;
    type?: "text" | "image" | "video" | "file" | "reply" | "forward" | "audio" | "patient-card" | "lead-request" | "call-summary";
    mediaUrl?: string;
    replyTo?: string;
    forwardedFrom?: string;
  },
): Promise<InternalMessage> {
  const thread = await db
    .select()
    .from(internalMessageThreads)
    .where(eq(internalMessageThreads.id, threadId))
    .limit(1);

  if (!thread || thread.length === 0) {
    throw new Error("Thread not found");
  }

  const messageId = uuidv4();
  const now = new Date();

  const newMessage: InternalMessage = {
    id: messageId,
    text: message.text || "",
    sender: message.sender,
    senderId: message.senderId,
    timestamp: now,
    type: message.type || "text",
    mediaUrl: message.mediaUrl || "",
    replyTo: message.replyTo,
    forwardedFrom: message.forwardedFrom || "",
    deletedAt: null,
    updatedAt: null,
    read: false,
    readAt: null,
  };

  // Primary write: insert into normalized internal_messages table
  await db.insert(internalMessages).values({
    id: messageId,
    threadId: threadId,
    text: message.text || "",
    sender: message.sender,
    senderId: message.senderId,
    timestamp: now,
    type: (message.type || "text") as any,
    mediaUrl: message.mediaUrl || "",
    replyTo: message.replyTo,
    forwardedFrom: message.forwardedFrom || "",
    read: false,
  });

  // Increment per-user unread count for all active participants except sender
  await db
    .update(internalMessageThreadParticipants)
    .set({
      unreadCount: sql`${internalMessageThreadParticipants.unreadCount} + 1`,
    })
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, threadId),
        sql`${internalMessageThreadParticipants.userId} != ${message.senderId}`,
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    );

  // Backward compat: also update JSON column for old mobile clients
  const currentMessages = (thread[0].messages as InternalMessage[]) || [];
  const updatedMessages = [...currentMessages, newMessage];

  await db
    .update(internalMessageThreads)
    .set({
      messages: updatedMessages,
      lastActivity: now,
      updatedAt: now,
    })
    .where(eq(internalMessageThreads.id, threadId));

  return newMessage;
}

/**
 * Get messages for a thread from the normalized internal_messages table
 */
export async function getMessagesForThread(threadId: string) {
  return db
    .select()
    .from(internalMessages)
    .where(eq(internalMessages.threadId, threadId))
    .orderBy(asc(internalMessages.timestamp));
}

/**
 * Mark internal thread as read (per-user via junction table)
 */
export async function markInternalThreadAsRead(
  threadId: string,
  userId: string,
): Promise<{ success: boolean; previousUnread: number }> {
  const [participantRow] = await db
    .select()
    .from(internalMessageThreadParticipants)
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, threadId),
        eq(internalMessageThreadParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (!participantRow) {
    throw new Error("Unauthorized: Not a participant in this thread");
  }

  if (participantRow.leftAt) {
    throw new Error("You have left this thread");
  }

  const previousUnread = participantRow.unreadCount || 0;

  await db
    .update(internalMessageThreadParticipants)
    .set({
      unreadCount: 0,
      lastReadAt: new Date(),
    })
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, threadId),
        eq(internalMessageThreadParticipants.userId, userId),
      ),
    );

  return { success: true, previousUnread };
}

/**
 * Get participants with their user data
 */
export async function getThreadParticipantsWithUserData(
  participantIds: string[],
) {
  if (!participantIds || participantIds.length === 0) {
    return [];
  }

  const participants = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      image: users.image,
      accountType: users.accountType,
      doctorSpecialty: users.doctorSpecialty,
    })
    .from(users)
    .where(inArray(users.id, participantIds));

  return participants;
}

/**
 * Get user IDs by account type and specialty
 */
export async function getUserIdsByAccountTypeAndSpecialty(
  accountTypes: string[],
  specialty?: string,
): Promise<string[]> {
  let query = db.select({ userId: userSettings.userId }).from(userSettings);

  if (specialty) {
    // Join with users to check specialty
    const results = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .where(
        and(
          inArray(
            users.accountType,
            accountTypes as ("Doctor" | "Triage")[],
          ),
          sql`${specialty} = ANY(${users.doctorSpecialty})`,
        ),
      );
    return results.map((r) => r.userId);
  } else {
    // Just filter by account type
    const results = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .where(
        inArray(
          users.accountType,
          accountTypes as ("Doctor" | "Triage")[],
        ),
      );
    return results.map((r) => r.userId);
  }
}

/**
 * Ensure default internal message groups exist for a user
 */
export async function ensureDefaultInternalGroupsForUser(
  userId: string,
  accountType: string,
  specialties: string[],
): Promise<void> {
  const groups: {
    title: string;
    accountTypes: string[];
    specialty?: string;
  }[] = [];

  // All users get the combined group
  groups.push({
    title: "All Triage and Doctors",
    accountTypes: ["Doctor", "Triage"],
  });

  if (accountType === "Doctor") {
    groups.push({
      title: "All Doctors",
      accountTypes: ["Doctor"],
    });
  }

  if (accountType === "Triage") {
    groups.push({
      title: "All Triage",
      accountTypes: ["Triage"],
    });
  }

  for (const specialty of specialties) {
    groups.push({
      title: `Specialty: ${specialty}`,
      accountTypes: ["Doctor"],
      specialty: specialty,
    });
  }

  // Create or update each group
  for (const group of groups) {
    const memberIds = await getUserIdsByAccountTypeAndSpecialty(
      group.accountTypes,
      group.specialty,
    );
    const participants = dedupeUserIds([...memberIds, userId]);

    await getOrCreateInternalThreadByTitle(
      group.title,
      participants,
      userId,
      true,
    );
  }
}

/**
 * Get formatted threads for API response
 */
export async function getFormattedInternalThreadsForUser(
  userId: string,
  limit: number = 50,
): Promise<any[]> {
  const threads = await getInternalThreadsForUser(userId, limit);

  // Get last message per thread from the normalized table
  const threadIds = threads.map((t) => t.id);
  const lastMessages =
    threadIds.length > 0
      ? await db
          .select()
          .from(internalMessages)
          .where(
            and(
              inArray(internalMessages.threadId, threadIds),
              sql`${internalMessages.id} IN (
                SELECT id FROM internal_messages im2
                WHERE im2.thread_id = ${internalMessages.threadId}
                ORDER BY im2.timestamp DESC
                LIMIT 1
              )`,
            ),
          )
      : [];
  const lastMessageMap = new Map(lastMessages.map((m) => [m.threadId, m]));

  return threads.map((thread) => {
    const lastMsg = lastMessageMap.get(thread.id);

    return {
      _id: thread.id,
      participants: thread.participants || [],
      unreadCount: thread.userUnreadCount || 0,
      messages: lastMsg
        ? [
            {
              id: lastMsg.id,
              text: lastMsg.text,
              sender: lastMsg.sender,
              senderId: lastMsg.senderId,
              timestamp: lastMsg.timestamp,
              type: lastMsg.type,
              mediaUrl: lastMsg.mediaUrl,
            },
          ]
        : [],
      title: thread.title,
      slug: slugify(thread.title || ""),
      type: "internal",
      isGroupChat: thread.isGroupChat,
      lastActivity: thread.lastActivity,
    };
  });
}

/**
 * Get ALL internal message threads for a user (both group and 1:1, per-user unread via junction table)
 */
export async function getAllInternalThreadsForUser(
  userId: string,
  limit: number = 50,
): Promise<(InternalMessageThread & { userUnreadCount: number })[]> {
  const threads = await db
    .select({
      id: internalMessageThreads.id,
      title: internalMessageThreads.title,
      participants: internalMessageThreads.participants,
      unreadCount: internalMessageThreads.unreadCount,
      status: internalMessageThreads.status,
      messages: internalMessageThreads.messages,
      lastActivity: internalMessageThreads.lastActivity,
      createdBy: internalMessageThreads.createdBy,
      isGroupChat: internalMessageThreads.isGroupChat,
      createdAt: internalMessageThreads.createdAt,
      updatedAt: internalMessageThreads.updatedAt,
      userUnreadCount: internalMessageThreadParticipants.unreadCount,
    })
    .from(internalMessageThreads)
    .innerJoin(
      internalMessageThreadParticipants,
      and(
        eq(internalMessageThreadParticipants.threadId, internalMessageThreads.id),
        eq(internalMessageThreadParticipants.userId, userId),
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    )
    .orderBy(desc(internalMessageThreads.lastActivity))
    .limit(limit);

  return threads;
}

/**
 * Find existing 1:1 thread or create new one
 */
export async function getOrCreateDirectThread(
  currentUserId: string,
  otherUserId: string,
): Promise<InternalMessageThread> {
  // Find existing 1:1 thread between these two users
  const [existing] = await db
    .select()
    .from(internalMessageThreads)
    .where(
      and(
        eq(internalMessageThreads.isGroupChat, false),
        sql`${internalMessageThreads.participants} @> ARRAY[${currentUserId}, ${otherUserId}]::text[]`,
        sql`array_length(${internalMessageThreads.participants}, 1) = 2`,
      ),
    )
    .limit(1);

  if (existing) {
    // Ensure junction table is in sync
    await syncParticipantsToJunctionTable(existing.id, existing.participants || []);
    return existing;
  }

  // Create new 1:1 thread
  const participants = dedupeUserIds([currentUserId, otherUserId]);
  const [newThread] = await db
    .insert(internalMessageThreads)
    .values({
      title: "", // Empty title for 1:1 - display name resolved from participant
      participants,
      isGroupChat: false,
      createdBy: currentUserId,
      messages: [],
      unreadCount: 0,
      status: "active",
      lastActivity: new Date(),
    })
    .returning();

  // Populate junction table for PowerSync sync
  await syncParticipantsToJunctionTable(newThread.id, participants);

  return newThread;
}

/**
 * Create a new group chat thread (with duplicate detection for untitled groups)
 */
export async function createGroupThread(
  creatorId: string,
  participantIds: string[],
  title?: string,
): Promise<{ thread: InternalMessageThread; existing: boolean }> {
  const allParticipants = dedupeUserIds([creatorId, ...participantIds]);

  // Check for existing group with same participants (only for untitled groups)
  if (!title) {
    const existing = await findExistingGroupThread(allParticipants);
    if (existing) {
      return { thread: existing, existing: true };
    }
  }

  // Auto-generate title if not provided
  let finalTitle = title;
  if (!finalTitle) {
    const participantData = await getThreadParticipantsWithUserData(
      participantIds.slice(0, 3), // Get first 3 for title
    );
    const names = participantData.map((p) => p.firstName).join(", ");
    finalTitle =
      participantIds.length > 3
        ? `Group with ${names}...`
        : `Group with ${names}`;
  }

  const [newThread] = await db
    .insert(internalMessageThreads)
    .values({
      title: finalTitle,
      participants: allParticipants,
      isGroupChat: true,
      createdBy: creatorId,
      messages: [],
      unreadCount: 0,
      status: "active",
      lastActivity: new Date(),
    })
    .returning();

  // Populate junction table for PowerSync sync
  await syncParticipantsToJunctionTable(newThread.id, allParticipants);

  return { thread: newThread, existing: false };
}

/**
 * Add participants to an existing thread
 */
export async function addParticipantsToThread(
  threadId: string,
  newParticipantIds: string[],
  requestingUserId: string,
): Promise<{ success: boolean; thread: InternalMessageThread }> {
  // Get the existing thread
  const [thread] = await db
    .select()
    .from(internalMessageThreads)
    .where(eq(internalMessageThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error("Thread not found");
  }

  // Verify requesting user is a participant
  const isParticipant = thread.participants?.includes(requestingUserId) || false;
  if (!isParticipant) {
    throw new Error("Unauthorized: Not a participant in this thread");
  }

  // Merge existing and new participants, removing duplicates
  const existingParticipants = thread.participants || [];
  const allParticipants = dedupeUserIds([...existingParticipants, ...newParticipantIds]);

  // Update the thread
  const [updatedThread] = await db
    .update(internalMessageThreads)
    .set({
      participants: allParticipants,
      updatedAt: new Date(),
    })
    .where(eq(internalMessageThreads.id, threadId))
    .returning();

  // Sync junction table with updated participants
  await syncParticipantsToJunctionTable(threadId, allParticipants);

  return { success: true, thread: updatedThread };
}

/**
 * Backfill junction table for all existing threads.
 * Call this once to populate internal_message_thread_participants
 * from the participants array on each thread.
 */
export async function backfillParticipantsJunctionTable(): Promise<number> {
  const allThreads = await db
    .select({
      id: internalMessageThreads.id,
      participants: internalMessageThreads.participants,
    })
    .from(internalMessageThreads);

  let synced = 0;
  for (const thread of allThreads) {
    if (thread.participants && thread.participants.length > 0) {
      await syncParticipantsToJunctionTable(thread.id, thread.participants);
      synced++;
    }
  }
  return synced;
}

/**
 * System group titles that cannot be left
 */
const SYSTEM_GROUP_TITLES = ["All Doctors", "All Triage", "All Triage and Doctors"];

function isSystemGroup(title: string | null | undefined): boolean {
  if (!title) return false;
  return SYSTEM_GROUP_TITLES.includes(title) || title.startsWith("Specialty: ");
}

/**
 * Leave an internal message thread (soft leave via leftAt)
 */
export async function leaveThread(
  threadId: string,
  userId: string,
): Promise<{ success: boolean }> {
  const [thread] = await db
    .select()
    .from(internalMessageThreads)
    .where(eq(internalMessageThreads.id, threadId))
    .limit(1);

  if (!thread) {
    throw new Error("Thread not found");
  }

  if (isSystemGroup(thread.title)) {
    throw new Error("Cannot leave system groups");
  }

  // Get the user's active junction row
  const [participantRow] = await db
    .select()
    .from(internalMessageThreadParticipants)
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, threadId),
        eq(internalMessageThreadParticipants.userId, userId),
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!participantRow) {
    throw new Error("Not an active participant in this thread");
  }

  // Set leftAt on the junction row
  await db
    .update(internalMessageThreadParticipants)
    .set({ leftAt: new Date() })
    .where(eq(internalMessageThreadParticipants.id, participantRow.id));

  // Check if this was the last active participant — auto-archive
  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(internalMessageThreadParticipants)
    .where(
      and(
        eq(internalMessageThreadParticipants.threadId, threadId),
        sql`${internalMessageThreadParticipants.leftAt} IS NULL`,
      ),
    );

  if (remaining && remaining.count === 0) {
    await db
      .update(internalMessageThreads)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(internalMessageThreads.id, threadId));
  }

  return { success: true };
}

/**
 * Find an existing active group thread with exactly the same participants
 */
export async function findExistingGroupThread(
  participantIds: string[],
): Promise<InternalMessageThread | null> {
  const sorted = [...participantIds].sort();
  const count = sorted.length;

  // Use both-way containment (@> and <@) plus length check for exact match
  const candidates = await db
    .select()
    .from(internalMessageThreads)
    .where(
      and(
        eq(internalMessageThreads.isGroupChat, true),
        eq(internalMessageThreads.status, "active"),
        sql`${internalMessageThreads.participants} @> ARRAY[${sql.join(sorted.map((id) => sql`${id}`), sql`, `)}]::text[]`,
        sql`${internalMessageThreads.participants} <@ ARRAY[${sql.join(sorted.map((id) => sql`${id}`), sql`, `)}]::text[]`,
        sql`array_length(${internalMessageThreads.participants}, 1) = ${count}`,
      ),
    )
    .limit(1);

  return candidates[0] || null;
}

/**
 * Get ALL formatted threads for API response (both group and 1:1)
 */
export async function getAllFormattedInternalThreadsForUser(
  userId: string,
  limit: number = 50,
): Promise<any[]> {
  const threads = await getAllInternalThreadsForUser(userId, limit);

  // Get all unique participant IDs to resolve names
  const allParticipantIds = new Set<string>();
  threads.forEach((thread) => {
    thread.participants?.forEach((p) => allParticipantIds.add(p));
  });

  // Fetch all participant data in one query
  const participantData = await getThreadParticipantsWithUserData(
    Array.from(allParticipantIds),
  );
  const participantMap = new Map(participantData.map((p) => [p.id, p]));

  // Get last message per thread from the normalized table
  const threadIds = threads.map((t) => t.id);
  const lastMessages =
    threadIds.length > 0
      ? await db
          .select()
          .from(internalMessages)
          .where(
            and(
              inArray(internalMessages.threadId, threadIds),
              sql`${internalMessages.id} IN (
                SELECT id FROM internal_messages im2
                WHERE im2.thread_id = ${internalMessages.threadId}
                ORDER BY im2.timestamp DESC
                LIMIT 1
              )`,
            ),
          )
      : [];
  const lastMessageMap = new Map(lastMessages.map((m) => [m.threadId, m]));

  return threads.map((thread) => {
    const lastMsg = lastMessageMap.get(thread.id);

    // For 1:1 threads, resolve the other participant's name
    let displayTitle = thread.title;
    let otherParticipant = null;
    if (!thread.isGroupChat) {
      const otherParticipantId = thread.participants?.find((p) => p !== userId);
      if (otherParticipantId) {
        otherParticipant = participantMap.get(otherParticipantId);
        displayTitle = otherParticipant
          ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
          : "Unknown User";
      }
    }

    return {
      _id: thread.id,
      participants: thread.participants || [],
      participantDetails: thread.participants?.map((p) => participantMap.get(p)).filter(Boolean) || [],
      unreadCount: thread.userUnreadCount || 0,
      messages: lastMsg
        ? [
            {
              id: lastMsg.id,
              text: lastMsg.text,
              sender: lastMsg.sender,
              senderId: lastMsg.senderId,
              timestamp: lastMsg.timestamp,
              type: lastMsg.type,
              mediaUrl: lastMsg.mediaUrl,
            },
          ]
        : [],
      title: thread.title,
      displayTitle,
      slug: thread.isGroupChat ? slugify(thread.title || "") : thread.id,
      type: "internal",
      isGroupChat: thread.isGroupChat,
      status: thread.status,
      lastActivity: thread.lastActivity,
      otherParticipant,
    };
  });
}
