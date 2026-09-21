// db/schema/patientDrafts.ts
// Dedicated table for in-progress patient drafts (auto-save)
// Drafts live here until published, at which point they move to the patients table.

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { missions } from "./missions";

export const patientDrafts = pgTable(
  "patient_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Core intake fields (subset of patients table)
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    phone: json("phone").$type<{
      countryCode: string;
      phoneNumber: string;
    }>(),
    email: varchar("email", { length: 255 }),
    dob: timestamp("dob", { withTimezone: true }),
    gender: varchar("gender", { length: 50 }), // varchar not enum — drafts are lenient
    country: varchar("country", { length: 255 }),
    city: varchar("city", { length: 255 }),
    language: varchar("language", { length: 100 }),

    // Medical basics
    chiefComplaint: text("chief_complaint"),
    allergies: text("allergies"),
    currentMeds: text("current_meds"),

    // Assignment
    specialties: text("specialties").array(),
    hospital: varchar("hospital", { length: 255 }),
    missionId: uuid("mission_id").references(() => missions.id, {
      onDelete: "set null",
    }),

    // Audit — every draft must have an owner
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdByIdIdx: index("patient_drafts_created_by_id_idx").on(
      table.createdById,
    ),
    updatedAtIdx: index("patient_drafts_updated_at_idx").on(table.updatedAt),
  }),
);

export type PatientDraft = typeof patientDrafts.$inferSelect;
export type NewPatientDraft = typeof patientDrafts.$inferInsert;
