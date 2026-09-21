// db/schema/userMessages.ts
import {
  pgTable,
  uuid,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// User Messages table - tracks message thread participation and unread counts
export const userMessages = pgTable(
  "user_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(), // One record per user
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).defaultNow().notNull(),
    unreadCount: integer("unread_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_messages_user_id_idx").on(table.userId),
    unreadCountIdx: index("user_messages_unread_count_idx").on(table.unreadCount),
  }),
);

// Types for TypeScript
export type UserMessages = typeof userMessages.$inferSelect;
export type NewUserMessages = typeof userMessages.$inferInsert;
