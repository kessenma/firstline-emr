// db/schema/passkeyCredentials.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
  bigint,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Passkey Credentials table - stores WebAuthn credentials for users
// Each row represents one passkey/authenticator registered by a user
export const passkeyCredentials = pgTable(
  "passkey_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User association (required - passkeys are always tied to a user)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // WebAuthn credential data
    credentialId: text("credential_id").notNull(), // Base64URL encoded credential ID
    publicKey: text("public_key").notNull(), // Base64URL encoded public key
    counter: bigint("counter", { mode: "number" }).notNull().default(0), // Signature counter for replay attack prevention

    // Authenticator information
    credentialDeviceType: varchar("credential_device_type", { length: 32 }), // 'singleDevice' or 'multiDevice'
    credentialBackedUp: boolean("credential_backed_up").default(false), // Whether synced across devices
    transports: text("transports").array(), // ['usb', 'ble', 'nfc', 'internal', 'hybrid']

    // User-friendly metadata
    deviceName: varchar("device_name", { length: 255 }), // User-provided name like "My iPhone"
    aaguid: varchar("aaguid", { length: 36 }), // Authenticator Attestation GUID

    // State tracking
    isActive: boolean("is_active").default(true).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Index for fast user queries
    userIdActiveIdx: index("passkey_credentials_user_id_active_idx").on(
      table.userId,
      table.isActive,
    ),

    // Index for credential ID lookups (used during authentication)
    credentialIdIdx: index("passkey_credentials_credential_id_idx").on(
      table.credentialId,
    ),

    // Unique constraint: one credential ID globally (credential IDs are unique per RP)
    uniqueCredentialId: unique("passkey_credentials_credential_id_unique").on(
      table.credentialId,
    ),
  }),
);

// Types for TypeScript
export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type NewPasskeyCredential = typeof passkeyCredentials.$inferInsert;
