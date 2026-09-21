// db/schema/telegramMessages.ts
// Normalized telegram messages table - one row per message
// Replaces the JSON array stored in telegram_threads.messages
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { telegramThreads, messageTypeEnum } from "./telegramThreads";

export const telegramMessages = pgTable(
  "telegram_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => telegramThreads.id, { onDelete: "cascade" }),
    text: text("text").default("").notNull(),
    sender: text("sender").notNull(),
    senderId: text("sender_id"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    type: messageTypeEnum("type").default("text").notNull(),
    mediaUrl: text("media_url").default(""),
    replyTo: text("reply_to"),
    forwardedFrom: text("forwarded_from").default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    translatedText: text("translated_text"),
    isTranslated: boolean("is_translated").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    threadIdIdx: index("telegram_messages_thread_id_idx").on(table.threadId),
    senderIdIdx: index("telegram_messages_sender_id_idx").on(table.senderId),
    timestampIdx: index("telegram_messages_timestamp_idx").on(table.timestamp),
    threadTimestampIdx: index("telegram_messages_thread_timestamp_idx").on(
      table.threadId,
      table.timestamp,
    ),
  }),
);

export type TelegramMessageRow = typeof telegramMessages.$inferSelect;
export type NewTelegramMessageRow = typeof telegramMessages.$inferInsert;
