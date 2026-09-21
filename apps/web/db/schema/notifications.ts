// db/schema/notifications.ts
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
export const notificationTypeEnum = pgEnum("notification_type", [
  "message",
  "alert",
  "profile_update_approved",
  "profile_update_denied",
  "profile_update_request",
  "patient_update",
  "system_notification",
  "new_user_signup",
  "specialty_no_doctors",
  "missed_call",
]);

export const notificationMethodEnum = pgEnum("notification_method", [
  "in-app",
  "email",
]);

// Notifications table - stores the notification content
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id"), // ID of the entity that triggered the notification
    message: text("message").notNull(),
    type: notificationTypeEnum("type").default("message").notNull(),
    subject: varchar("subject", { length: 500 }), // Only used for email, if needed
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    redirectTo: varchar("redirect_to", { length: 500 }), // URL for custom navigation
    category: varchar("category", { length: 50 }), // 'internal_message' | 'patient_message' | 'patient_action' | null
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdIdx: index("notifications_source_id_idx").on(table.sourceId),
    patientIdIdx: index("notifications_patient_id_idx").on(table.patientId),
    typeIdx: index("notifications_type_idx").on(table.type),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  }),
);

// User Notifications table - junction table linking users to notifications
export const userNotifications = pgTable(
  "user_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    read: boolean("read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissed: boolean("dismissed").default(false).notNull(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_notifications_user_id_idx").on(table.userId),
    notificationIdIdx: index("user_notifications_notification_id_idx").on(
      table.notificationId,
    ),
    readIdx: index("user_notifications_read_idx").on(table.read),
    dismissedIdx: index("user_notifications_dismissed_idx").on(table.dismissed),
    // Composite index for efficient queries
    userReadIdx: index("user_notifications_user_read_idx").on(
      table.userId,
      table.read,
    ),
  }),
);

// Notification Recipients table - stores intended recipients
export const notificationRecipients = pgTable(
  "notification_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    notificationIdIdx: index("notification_recipients_notification_id_idx").on(
      table.notificationId,
    ),
    userIdIdx: index("notification_recipients_user_id_idx").on(table.userId),
  }),
);

// Types for TypeScript
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserNotification = typeof userNotifications.$inferSelect;
export type NewUserNotification = typeof userNotifications.$inferInsert;
export type NotificationRecipient = typeof notificationRecipients.$inferSelect;
export type NewNotificationRecipient =
  typeof notificationRecipients.$inferInsert;
