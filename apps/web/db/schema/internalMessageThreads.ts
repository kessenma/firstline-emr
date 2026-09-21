// db/schema/internalMessageThreads.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Enums
export const internalThreadStatusEnum = pgEnum("internal_thread_status", [
  "active",
  "archived",
]);

export const internalMessageTypeEnum = pgEnum("internal_message_type", [
  "text",
  "image",
  "video",
  "file",
  "reply",
  "forward",
  "audio",
  "patient-card",
  "lead-request",
  // A finished staff call, written by /api/calls/[id]/end. Like patient-card,
  // the payload is JSON in the `text` column and both clients render it as a
  // card — an unhandled type would show raw JSON.
  "call-summary",
]);

// Message type for JSON column
export type InternalMessage = {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  type: "text" | "image" | "video" | "file" | "reply" | "forward" | "audio" | "patient-card" | "lead-request" | "call-summary";
  mediaUrl?: string;
  replyTo?: string;
  forwardedFrom?: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  read: boolean;
  readAt?: Date | null;
};

// Internal Message Threads table
export const internalMessageThreads = pgTable(
  "internal_message_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).default(""),
    participants: text("participants").array().notNull(), // Array of user IDs
    unreadCount: integer("unread_count").default(0).notNull(),
    status: internalThreadStatusEnum("status").default("active").notNull(),
    messages: json("messages").$type<InternalMessage[]>().default([]),
    lastActivity: timestamp("last_activity", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    isGroupChat: boolean("is_group_chat").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    participantsIdx: index("internal_message_threads_participants_idx").on(
      table.participants,
    ),
    statusIdx: index("internal_message_threads_status_idx").on(table.status),
    lastActivityIdx: index("internal_message_threads_last_activity_idx").on(
      table.lastActivity,
    ),
    createdByIdx: index("internal_message_threads_created_by_idx").on(table.createdBy),
  }),
);

// Internal Message Thread Participants junction table (for better querying)
export const internalMessageThreadParticipants = pgTable(
  "internal_message_thread_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => internalMessageThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    unreadCount: integer("unread_count").default(0).notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => ({
    threadIdIdx: index("internal_message_thread_participants_thread_id_idx").on(
      table.threadId,
    ),
    userIdIdx: index("internal_message_thread_participants_user_id_idx").on(
      table.userId,
    ),
    // Composite index for efficient queries
    threadUserIdx: index("internal_message_thread_participants_thread_user_idx").on(
      table.threadId,
      table.userId,
    ),
  }),
);

// Types for TypeScript
export type InternalMessageThread = typeof internalMessageThreads.$inferSelect;
export type NewInternalMessageThread = typeof internalMessageThreads.$inferInsert;
export type InternalMessageThreadParticipant =
  typeof internalMessageThreadParticipants.$inferSelect;
export type NewInternalMessageThreadParticipant =
  typeof internalMessageThreadParticipants.$inferInsert;
