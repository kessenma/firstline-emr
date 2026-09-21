// db/schema/patientCareTeam.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { users } from "./users";

// Care team role enum — per-patient function roles, orthogonal to accountType/doctorSpecialty
export const careTeamRoleEnum = pgEnum("care_team_role", [
  "surgeon",
  "assistant",
  "consulting",
  "triage",
  "coordinator",
]);

// Conflict status enum
export const conflictStatusEnum = pgEnum("conflict_status", [
  "unresolved",
  "resolved",
]);

// Patient Care Team — many-to-many junction between patients and users
export const patientCareTeam = pgTable(
  "patient_care_team",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: careTeamRoleEnum("role").notNull(),
    isLead: boolean("is_lead").default(false).notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    assignedBy: uuid("assigned_by").references(() => users.id),
    removedAt: timestamp("removed_at", { withTimezone: true }), // soft delete for audit trail
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index("pct_patient_id_idx").on(table.patientId),
    userIdIdx: index("pct_user_id_idx").on(table.userId),
    isLeadIdx: index("pct_is_lead_idx").on(table.patientId, table.isLead),
    removedAtIdx: index("pct_removed_at_idx").on(table.removedAt),
    // NOTE: Partial unique index (patient_id, user_id) WHERE removed_at IS NULL
    // is defined in the migration SQL since Drizzle doesn't support partial indexes
  }),
);

// Care Team Conflicts — tracks when multiple doctors claim lead on same patient
export const careTeamConflicts = pgTable(
  "care_team_conflicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    conflictingUserIds: text("conflicting_user_ids").array().notNull(),
    status: conflictStatusEnum("status").default("unresolved").notNull(),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index("ctc_patient_id_idx").on(table.patientId),
    statusIdx: index("ctc_status_idx").on(table.status),
    createdAtIdx: index("ctc_created_at_idx").on(table.createdAt),
  }),
);

// Types
export type PatientCareTeam = typeof patientCareTeam.$inferSelect;
export type NewPatientCareTeam = typeof patientCareTeam.$inferInsert;
export type CareTeamConflict = typeof careTeamConflicts.$inferSelect;
export type NewCareTeamConflict = typeof careTeamConflicts.$inferInsert;
