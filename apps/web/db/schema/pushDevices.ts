// db/schema/pushDevices.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Platform enum for device types.
// "ios_voip" is a PushKit token, which is a *different* token from the same
// device than the regular APNs one - hence its own row rather than an extra
// column. This also keeps alert pushes (platform = "ios") from ever being sent
// to a VoIP token, which APNs would reject.
export const platformEnum = pgEnum("device_platform", [
  "ios",
  "android",
  "ios_voip",
]);

// Environment enum for APNs (dev vs prod certificates)
export const environmentEnum = pgEnum("device_environment", ["dev", "prod"]);

// Push Devices table - stores device tokens for push notifications
// Each row represents one device/app installation
export const pushDevices = pgTable(
  "push_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User association (nullable to support pre-login token registration)
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),

    // Device information
    platform: platformEnum("platform").notNull(),
    token: text("token").notNull(), // APNs or FCM token
    environment: environmentEnum("environment").default("prod").notNull(),

    // Device state
    isActive: boolean("is_active").default(true).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),

    // Optional metadata for better device tracking
    deviceId: varchar("device_id", { length: 255 }), // Vendor ID or generated install ID
    deviceModel: varchar("device_model", { length: 100 }), // e.g., "iPhone 13 Pro", "Samsung S21"
    appVersion: varchar("app_version", { length: 50 }),
    buildNumber: varchar("build_number", { length: 50 }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Index for fast user queries
    userIdActiveIdx: index("push_devices_user_id_active_idx").on(
      table.userId,
      table.isActive,
    ),

    // Index for token lookups
    tokenIdx: index("push_devices_token_idx").on(table.token),

    // Index for cleanup queries (find stale devices)
    lastSeenIdx: index("push_devices_last_seen_idx").on(table.lastSeenAt),

    // Unique constraint: one token per platform/environment combination
    // This prevents duplicate registrations and handles device reassignment
    uniqueToken: unique("push_devices_token_platform_env_unique").on(
      table.token,
      table.platform,
      table.environment,
    ),
  }),
);

// Types for TypeScript
export type PushDevice = typeof pushDevices.$inferSelect;
export type NewPushDevice = typeof pushDevices.$inferInsert;

// Helper type for active device queries
export type ActivePushDevice = PushDevice & { isActive: true };
