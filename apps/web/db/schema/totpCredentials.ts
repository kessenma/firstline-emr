// db/schema/totpCredentials.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// TOTP Credentials table - stores encrypted TOTP secrets for 2FA
// Secrets are encrypted with AES-256-GCM using TOTP_ENCRYPTION_KEY env var
export const totpCredentials = pgTable(
  "totp_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User association
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Encrypted TOTP secret (AES-256-GCM)
    encryptedSecret: text("encrypted_secret").notNull(),
    encryptionIv: text("encryption_iv").notNull(), // Initialization vector
    encryptionTag: text("encryption_tag").notNull(), // GCM auth tag

    // State tracking
    isActive: boolean("is_active").default(true).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(), // True after first successful code verification
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdActiveIdx: index("totp_credentials_user_id_active_idx").on(
      table.userId,
      table.isActive,
    ),
  }),
);

// Types for TypeScript
export type TotpCredential = typeof totpCredentials.$inferSelect;
export type NewTotpCredential = typeof totpCredentials.$inferInsert;
