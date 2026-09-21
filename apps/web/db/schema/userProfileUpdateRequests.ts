// db/schema/userProfileUpdateRequests.ts
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

// Enum for request status
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "denied",
]);

// Enum for field types that require admin approval
export const adminApprovalFieldEnum = pgEnum("admin_approval_field", [
  "doctorSpecialty",
  "accountType",
]);

// User Profile Update Requests table
export const userProfileUpdateRequests = pgTable(
  "user_profile_update_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Field being requested for change
    fieldName: adminApprovalFieldEnum("field_name").notNull(),

    // Current and requested values (stored as JSON for flexibility)
    currentValue: json("current_value").$type<any>(),
    requestedValue: json("requested_value").$type<any>().notNull(),

    // Request status
    status: requestStatusEnum("status").default("pending").notNull(),

    // User information at time of request
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    userName: varchar("user_name", { length: 500 }).notNull(),

    // Admin action tracking
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedByEmail: varchar("reviewed_by_email", { length: 255 }),
    reviewedByName: varchar("reviewed_by_name", { length: 500 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),

    // Timestamps
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("profile_update_requests_user_id_idx").on(table.userId),
    statusIdx: index("profile_update_requests_status_idx").on(table.status),
    fieldNameIdx: index("profile_update_requests_field_name_idx").on(table.fieldName),
    // Composite index for finding pending requests by user
    userIdStatusIdx: index("profile_update_requests_user_id_status_idx").on(
      table.userId,
      table.status
    ),
  })
);

// Types for TypeScript
export type UserProfileUpdateRequest = typeof userProfileUpdateRequests.$inferSelect;
export type NewUserProfileUpdateRequest = typeof userProfileUpdateRequests.$inferInsert;
