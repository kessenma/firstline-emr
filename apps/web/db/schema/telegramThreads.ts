// db/schema/telegramThreads.ts
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
import { patients } from "./patients";
import { users } from "./users";

// Enums
export const threadStatusEnum = pgEnum("thread_status", ["active", "archived"]);
export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "video",
  "file",
  "reply",
  "forward",
  "audio",
]);

// Message type for JSON column
export type TelegramMessage = {
  id: string;
  text: string;
  sender: string;
  senderId: string | null;
  timestamp: Date;
  type: "text" | "image" | "video" | "file" | "reply" | "forward" | "audio";
  mediaUrl?: string;
  replyTo?: string;
  forwardedFrom?: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  originalMessage?: string; // Original message before send-time translation (e.g. English before en→ar)
  translatedText?: string; // English translation of the message
  isTranslated?: boolean; // Whether the message has been translated
  showTranslated?: boolean; // Whether to show translated or original text
};

// Telegram Threads table
export const telegramThreads = pgTable(
  "telegram_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: varchar("chat_id", { length: 255 }).notNull().unique(),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    participants: text("participants").array(), // Array of user IDs
    unreadCount: integer("unread_count").default(0).notNull(),
    status: threadStatusEnum("status").default("active").notNull(),
    messages: json("messages").$type<TelegramMessage[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chatIdIdx: index("telegram_threads_chat_id_idx").on(table.chatId),
    patientIdIdx: index("telegram_threads_patient_id_idx").on(table.patientId),
    statusIdx: index("telegram_threads_status_idx").on(table.status),
    participantsIdx: index("telegram_threads_participants_idx").on(table.participants),
  }),
);

// Telegram Thread Participants junction table (for better querying)
export const telegramThreadParticipants = pgTable(
  "telegram_thread_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => telegramThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    threadIdIdx: index("telegram_thread_participants_thread_id_idx").on(table.threadId),
    userIdIdx: index("telegram_thread_participants_user_id_idx").on(table.userId),
    // Composite index for efficient queries
    threadUserIdx: index("telegram_thread_participants_thread_user_idx").on(
      table.threadId,
      table.userId,
    ),
  }),
);

// Patient Follow-ups table
export const patientFollowUps = pgTable(
  "patient_follow_ups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: varchar("chat_id", { length: 255 }).notNull(),
    telegramThreadId: uuid("telegram_thread_id")
      .notNull()
      .references(() => telegramThreads.id, { onDelete: "cascade" }),
    message: text("message").default(""),
    followUpSentAt: timestamp("follow_up_sent_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chatIdIdx: index("patient_follow_ups_chat_id_idx").on(table.chatId),
    telegramThreadIdIdx: index("patient_follow_ups_telegram_thread_id_idx").on(
      table.telegramThreadId,
    ),
    followUpSentAtIdx: index("patient_follow_ups_follow_up_sent_at_idx").on(
      table.followUpSentAt,
    ),
  }),
);

// Types for TypeScript
export type TelegramThread = typeof telegramThreads.$inferSelect;
export type NewTelegramThread = typeof telegramThreads.$inferInsert;
export type TelegramThreadParticipant = typeof telegramThreadParticipants.$inferSelect;
export type NewTelegramThreadParticipant = typeof telegramThreadParticipants.$inferInsert;
export type PatientFollowUp = typeof patientFollowUps.$inferSelect;
export type NewPatientFollowUp = typeof patientFollowUps.$inferInsert;
