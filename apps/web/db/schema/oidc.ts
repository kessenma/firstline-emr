// db/schema/oidc.ts
// OIDC Provider tables for storing authorization codes, tokens, and sessions

import { pgTable, varchar, jsonb, timestamp, index, text } from 'drizzle-orm/pg-core';

// OIDC authorization codes
export const oidcAuthorizationCodes = pgTable(
  'oidc_authorization_codes',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    grantId: varchar('grant_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('oidc_auth_codes_expires_idx').on(table.expiresAt),
    grantIdIdx: index('oidc_auth_codes_grant_id_idx').on(table.grantId),
  }),
);

// OIDC access tokens
export const oidcAccessTokens = pgTable(
  'oidc_access_tokens',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    grantId: varchar('grant_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_access_tokens_expires_idx').on(table.expiresAt),
    grantIdIdx: index('oidc_access_tokens_grant_id_idx').on(table.grantId),
  }),
);

// OIDC refresh tokens
export const oidcRefreshTokens = pgTable(
  'oidc_refresh_tokens',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    grantId: varchar('grant_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('oidc_refresh_tokens_expires_idx').on(table.expiresAt),
    grantIdIdx: index('oidc_refresh_tokens_grant_id_idx').on(table.grantId),
  }),
);

// OIDC sessions (for login sessions)
export const oidcSessions = pgTable(
  'oidc_sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    grantId: varchar('grant_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_sessions_expires_idx').on(table.expiresAt),
    grantIdIdx: index('oidc_sessions_grant_id_idx').on(table.grantId),
  }),
);

// OIDC interactions (for the authorization flow)
export const oidcInteractions = pgTable(
  'oidc_interactions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_interactions_expires_idx').on(table.expiresAt),
  }),
);

// OIDC grants (for tracking consent)
export const oidcGrants = pgTable(
  'oidc_grants',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_grants_expires_idx').on(table.expiresAt),
  }),
);

// OIDC device codes (for device authorization flow if needed)
export const oidcDeviceCodes = pgTable(
  'oidc_device_codes',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userCode: varchar('user_code', { length: 255 }),
    grantId: varchar('grant_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('oidc_device_codes_expires_idx').on(table.expiresAt),
    userCodeIdx: index('oidc_device_codes_user_code_idx').on(table.userCode),
    grantIdIdx: index('oidc_device_codes_grant_id_idx').on(table.grantId),
  }),
);

// OIDC client credentials (for storing client secrets securely)
export const oidcClientCredentials = pgTable(
  'oidc_client_credentials',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('oidc_client_credentials_expires_idx').on(table.expiresAt),
  }),
);

// OIDC pushed authorization requests
export const oidcPushedAuthorizationRequests = pgTable(
  'oidc_pushed_authorization_requests',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_pushed_auth_requests_expires_idx').on(table.expiresAt),
  }),
);

// OIDC replay detection
export const oidcReplayDetection = pgTable(
  'oidc_replay_detection',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_replay_detection_expires_idx').on(table.expiresAt),
  }),
);

// OIDC backchannel authentication requests
export const oidcBackchannelAuthRequests = pgTable(
  'oidc_backchannel_auth_requests',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    payload: jsonb('payload').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('oidc_backchannel_auth_requests_expires_idx').on(table.expiresAt),
  }),
);

// Types for TypeScript
export type OidcAuthorizationCode = typeof oidcAuthorizationCodes.$inferSelect;
export type NewOidcAuthorizationCode = typeof oidcAuthorizationCodes.$inferInsert;
export type OidcAccessToken = typeof oidcAccessTokens.$inferSelect;
export type NewOidcAccessToken = typeof oidcAccessTokens.$inferInsert;
export type OidcRefreshToken = typeof oidcRefreshTokens.$inferSelect;
export type NewOidcRefreshToken = typeof oidcRefreshTokens.$inferInsert;
export type OidcSession = typeof oidcSessions.$inferSelect;
export type NewOidcSession = typeof oidcSessions.$inferInsert;
export type OidcInteraction = typeof oidcInteractions.$inferSelect;
export type NewOidcInteraction = typeof oidcInteractions.$inferInsert;
export type OidcGrant = typeof oidcGrants.$inferSelect;
export type NewOidcGrant = typeof oidcGrants.$inferInsert;
