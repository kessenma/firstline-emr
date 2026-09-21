// db/schema/adminNotifications.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Types for JSON columns
export interface AdminNotificationLink {
  url: string;
  displayName: string;
}

export interface AdminNotificationImage {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

// Enums
export const adminNotificationTypeEnum = pgEnum("admin_notification_type", [
  "announcement",
  "alert",
  "reminder",
]);

// Admin Notifications table - for system-wide admin notifications
export const adminNotifications = pgTable(
  "admin_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
    }), // Can be null for system notifications
    message: text("message").notNull(),
    type: adminNotificationTypeEnum("type")
      .default("announcement")
      .notNull(),
    emailSent: boolean("email_sent").default(false).notNull(),
    actionUrl: text("action_url"), // Optional route path like "/profile"
    description: text("description"), // Optional markdown body (supports bullet/numbered lists)
    links: json("links").$type<AdminNotificationLink[]>(), // Optional attached URLs
    images: json("images").$type<AdminNotificationImage[]>(), // Optional attached images
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    senderIdIdx: index("admin_notifications_sender_id_idx").on(table.senderId),
    typeIdx: index("admin_notifications_type_idx").on(table.type),
    createdAtIdx: index("admin_notifications_created_at_idx").on(
      table.createdAt,
    ),
    emailSentIdx: index("admin_notifications_email_sent_idx").on(
      table.emailSent,
    ),
  }),
);

// Types for TypeScript
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type NewAdminNotification = typeof adminNotifications.$inferInsert;
