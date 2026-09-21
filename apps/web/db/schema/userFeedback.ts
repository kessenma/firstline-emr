// db/schema/userFeedback.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { internalMessageThreads } from "./internalMessageThreads";

// Feedback category enum
export const feedbackCategoryEnum = pgEnum("feedback_category", [
  "feature_request",
  "bug",
  "question",
  "admin_assistance",
  "ui_improvement",
  "praise",
  "other",
  "offline_access",
]);

// Feedback status enum
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "open",
  "in_review",
  "resolved",
  "closed",
]);

// Feedback platform enum
export const feedbackPlatformEnum = pgEnum("feedback_platform", [
  "mobile",
  "web",
  "both",
]);

// Mobile platform enum (android/ios, only when platform includes mobile)
export const mobilePlatformEnum = pgEnum("mobile_platform", [
  "android",
  "ios",
]);

// Attachment type stored as JSON array on the feedback record
export interface FeedbackAttachment {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

// Sync diagnostics captured when reporting offline_access issues
export interface SyncDiagnostics {
  tableCounts: Record<string, number>;
  isConnected: boolean;
  connectionTimedOut: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  errors: string[];
  serverUrl: string;
  devicePlatform: string;
}

// User Feedback table
export const userFeedback = pgTable(
  "user_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: feedbackCategoryEnum("category").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    attachments: json("attachments").$type<FeedbackAttachment[]>().default([]),
    appSections: json("app_sections").$type<string[]>().default([]),
    platform: feedbackPlatformEnum("platform").notNull(),
    mobilePlatform: mobilePlatformEnum("mobile_platform"),
    status: feedbackStatusEnum("status").default("open").notNull(),
    syncDiagnostics: json("sync_diagnostics").$type<SyncDiagnostics | null>(),
    appVersion: varchar("app_version", { length: 50 }),
    adminNotes: text("admin_notes"),
    threadId: uuid("thread_id").references(() => internalMessageThreads.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("uf_user_id_idx").on(table.userId),
    statusIdx: index("uf_status_idx").on(table.status),
    categoryIdx: index("uf_category_idx").on(table.category),
    createdAtIdx: index("uf_created_at_idx").on(table.createdAt),
  }),
);

// Types
export type UserFeedback = typeof userFeedback.$inferSelect;
export type NewUserFeedback = typeof userFeedback.$inferInsert;
