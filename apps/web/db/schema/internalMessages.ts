// db/schema/internalMessages.ts
// Normalized internal messages table - one row per message
// Replaces the JSON array stored in internal_message_threads.messages
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import {
  internalMessageThreads,
  internalMessageTypeEnum,
} from "./internalMessageThreads";
import { users } from "./users";

export const internalMessages = pgTable(
  "internal_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => internalMessageThreads.id, { onDelete: "cascade" }),
    text: text("text").default("").notNull(),
    sender: text("sender").notNull(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    type: internalMessageTypeEnum("type").default("text").notNull(),
    mediaUrl: text("media_url").default(""),
    replyTo: text("reply_to"),
    forwardedFrom: text("forwarded_from").default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    read: boolean("read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    threadIdIdx: index("internal_messages_thread_id_idx").on(table.threadId),
    senderIdIdx: index("internal_messages_sender_id_idx").on(table.senderId),
    timestampIdx: index("internal_messages_timestamp_idx").on(table.timestamp),
    threadTimestampIdx: index("internal_messages_thread_timestamp_idx").on(
      table.threadId,
      table.timestamp,
    ),
  }),
);

export type InternalMessageRow = typeof internalMessages.$inferSelect;
export type NewInternalMessageRow = typeof internalMessages.$inferInsert;
