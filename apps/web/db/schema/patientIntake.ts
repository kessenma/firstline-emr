// db/schema/patientIntake.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { patients } from "./patients";

// Enums
export const intakeModeEnum = pgEnum("intake_mode", ["default", "custom"]);

// Patient Intake Configuration table
export const patientIntakes = pgTable(
  "patient_intakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    intakeMessage: text("intake_message").default(
      "Welcome! Please complete your registration:",
    ),
    confirmationMessage: text("confirmation_message").default(
      "Thank you for joining! We'll guide you through the next steps.",
    ),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    mode: intakeModeEnum("mode").default("default").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    updatedByIdx: index("patient_intakes_updated_by_idx").on(table.updatedBy),
    modeIdx: index("patient_intakes_mode_idx").on(table.mode),
  }),
);

// Telegram Intake Tokens table
export const telegramIntakeTokens = pgTable(
  "telegram_intake_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    telegramChatId: varchar("telegram_chat_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isValid: boolean("is_valid").default(true).notNull(),
    submitted: boolean("submitted").default(false).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => ({
    tokenIdx: index("telegram_intake_tokens_token_idx").on(table.token),
    patientIdIdx: index("telegram_intake_tokens_patient_id_idx").on(table.patientId),
    telegramChatIdIdx: index("telegram_intake_tokens_telegram_chat_id_idx").on(
      table.telegramChatId,
    ),
    isValidIdx: index("telegram_intake_tokens_is_valid_idx").on(table.isValid),
    submittedIdx: index("telegram_intake_tokens_submitted_idx").on(table.submitted),
    expiresAtIdx: index("telegram_intake_tokens_expires_at_idx").on(table.expiresAt),
  }),
);

// Types for TypeScript
export type PatientIntake = typeof patientIntakes.$inferSelect;
export type NewPatientIntake = typeof patientIntakes.$inferInsert;
export type TelegramIntakeToken = typeof telegramIntakeTokens.$inferSelect;
export type NewTelegramIntakeToken = typeof telegramIntakeTokens.$inferInsert;
