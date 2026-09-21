// db/schema/userProfileLogs.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  json,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Change type for JSON column
export type ProfileChange = {
  field: string;
  oldValue: any;
  newValue: any;
};

// User Profile Logs table - audit trail for user profile changes
export const userProfileLogs = pgTable(
  "user_profile_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
    changes: json("changes").$type<ProfileChange[]>().notNull(),
    isAdminAction: boolean("is_admin_action").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_profile_logs_user_id_idx").on(table.userId),
    changedByIdx: index("user_profile_logs_changed_by_idx").on(table.changedBy),
    changedAtIdx: index("user_profile_logs_changed_at_idx").on(table.changedAt),
    isAdminActionIdx: index("user_profile_logs_is_admin_action_idx").on(
      table.isAdminAction,
    ),
    // Composite index for efficient queries by user and date
    userChangedAtIdx: index("user_profile_logs_user_changed_at_idx").on(
      table.userId,
      table.changedAt,
    ),
  }),
);

// Types for TypeScript
export type UserProfileLog = typeof userProfileLogs.$inferSelect;
export type NewUserProfileLog = typeof userProfileLogs.$inferInsert;
