// db/schema/telegramLinkCodes.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { users } from "./users";

// Enums
export const pendingLinkStatusEnum = pgEnum("pending_link_status", [
  "pending",
  "matched",
  "expired",
  "rejected",
]);

// Telegram Link Codes table
export const telegramLinkCodes = pgTable(
  "telegram_link_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 10 }).notNull().unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    isUsed: boolean("is_used").default(false).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    telegramChatId: varchar("telegram_chat_id", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: index("telegram_link_codes_code_idx").on(table.code),
    patientIdIdx: index("telegram_link_codes_patient_id_idx").on(
      table.patientId,
    ),
    isUsedIdx: index("telegram_link_codes_is_used_idx").on(table.isUsed),
    createdByIdIdx: index("telegram_link_codes_created_by_id_idx").on(
      table.createdById,
    ),
  }),
);

// Pending Link Attempts table
// For when a patient sends a code to the bot before the doctor's code has synced from offline
export const pendingLinkAttempts = pgTable(
  "pending_link_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 10 }).notNull(),
    telegramChatId: varchar("telegram_chat_id", { length: 255 }).notNull(),
    status: pendingLinkStatusEnum("status").default("pending").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    codeIdx: index("pending_link_attempts_code_idx").on(table.code),
    statusIdx: index("pending_link_attempts_status_idx").on(table.status),
    telegramChatIdIdx: index("pending_link_attempts_telegram_chat_id_idx").on(
      table.telegramChatId,
    ),
  }),
);

// Types
export type TelegramLinkCode = typeof telegramLinkCodes.$inferSelect;
export type NewTelegramLinkCode = typeof telegramLinkCodes.$inferInsert;
export type PendingLinkAttempt = typeof pendingLinkAttempts.$inferSelect;
export type NewPendingLinkAttempt = typeof pendingLinkAttempts.$inferInsert;
