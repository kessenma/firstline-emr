// db/schema/backups.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
  integer,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ── Enums ──

export const backupStatusEnum = pgEnum("backup_status", [
  "uploading",
  "processing",
  "available",
  "restoring",
  "failed",
  "expired",
]);

export const backupModeEnum = pgEnum("backup_mode", [
  "clinical",
  "full_migration",
]);

export const restoreStatusEnum = pgEnum("restore_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

export const backupSourceEnum = pgEnum("backup_source", [
  "mobile",
  "server",
]);

export const conflictStrategyEnum = pgEnum("conflict_strategy", [
  "skip",
  "overwrite",
  "newer_wins",
]);

// ── Interfaces ──

export interface BackupTableManifest {
  tableName: string;
  recordCount: number;
  columns: string[];
}

export interface BackupDeviceInfo {
  platform: "ios" | "android" | "server";
  appVersion: string;
  powerSyncSchemaVersion?: string;
  deviceModel?: string;
}

export interface RestoreTableResult {
  tableName: string;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: string[];
}

export interface RestoreError {
  tableName: string;
  recordId: string;
  error: string;
  timestamp: string;
}

/** Non-secret metadata for a backup that bundles the encrypted auth dump. */
export interface BackupAuthMeta {
  zitadelVersion: string;
  externalDomain: string;
  masterkeyFingerprint: string | null;
  totpKeyFingerprint: string | null;
  webauthnRpId: string;
  masterkeyEmbedded: boolean;
  dumpSize: number;
  passkeyCount: number;
  totpCount: number;
}

// ── Tables ──

export const backups = pgTable(
  "backups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    filePath: text("file_path").notNull(),
    fileSize: integer("file_size").notNull(),
    status: backupStatusEnum("status").default("uploading").notNull(),
    backupMode: backupModeEnum("backup_mode").default("clinical").notNull(),
    backupSource: backupSourceEnum("backup_source").default("mobile").notNull(),
    tables: json("tables").$type<BackupTableManifest[]>().notNull(),
    totalRecords: integer("total_records").notNull(),
    checksum: varchar("checksum", { length: 64 }),
    deviceInfo: json("device_info").$type<BackupDeviceInfo>(),
    encrypted: boolean("encrypted").default(false).notNull(),
    // Auth bundle: app passkey/TOTP credentials + Zitadel DB dump, stored as a
    // separate encrypted `.fajr-auth` object referenced by authDumpPath.
    includesAuth: boolean("includes_auth").default(false).notNull(),
    authDumpPath: text("auth_dump_path"),
    authMeta: json("auth_meta").$type<BackupAuthMeta>(),
    errorMessage: text("error_message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdByIdx: index("bk_created_by_idx").on(table.createdBy),
    statusIdx: index("bk_status_idx").on(table.status),
    createdAtIdx: index("bk_created_at_idx").on(table.createdAt),
  }),
);

export const backupRestores = pgTable(
  "backup_restores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    backupId: uuid("backup_id")
      .notNull()
      .references(() => backups.id),
    restoredBy: uuid("restored_by")
      .notNull()
      .references(() => users.id),
    status: restoreStatusEnum("status").default("pending").notNull(),
    conflictStrategy: conflictStrategyEnum("conflict_strategy").notNull(),
    tablesRestored: json("tables_restored").$type<RestoreTableResult[]>(),
    totalInserted: integer("total_inserted").default(0),
    totalUpdated: integer("total_updated").default(0),
    totalSkipped: integer("total_skipped").default(0),
    totalFailed: integer("total_failed").default(0),
    errorLog: json("error_log").$type<RestoreError[]>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    backupIdIdx: index("br_backup_id_idx").on(table.backupId),
    restoredByIdx: index("br_restored_by_idx").on(table.restoredBy),
    statusIdx: index("br_status_idx").on(table.status),
  }),
);

// ── Types ──

export type Backup = typeof backups.$inferSelect;
export type NewBackup = typeof backups.$inferInsert;
export type BackupRestore = typeof backupRestores.$inferSelect;
export type NewBackupRestore = typeof backupRestores.$inferInsert;
