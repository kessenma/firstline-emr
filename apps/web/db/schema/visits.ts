// db/schema/visits.ts
import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  real,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";

// Enums
export const covidTestEnum = pgEnum("covid_test", ["pos", "neg"]);

// Visits table
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),

    // Vital signs
    temp: real("temp"), // Temperature
    bloodPressure: varchar("blood_pressure", { length: 50 }),

    // Lab values - Blood tests
    hba1c: real("hba1c"), // Hemoglobin A1C
    albumin: real("albumin"),
    sProtein: real("s_protein"), // Serum protein
    crp: real("crp"), // C-reactive protein
    esr: real("esr"), // Erythrocyte sedimentation rate
    hgbHct: real("hgb_hct"), // Hemoglobin/Hematocrit
    wbc: real("wbc"), // White blood cell count
    platelets: real("platelets"),

    // Coagulation tests
    pt: real("pt"), // Prothrombin time
    ptt: real("ptt"), // Partial thromboplastin time
    inr: real("inr"), // International normalized ratio

    // Liver function tests
    alkPhos: real("alk_phos"), // Alkaline phosphatase
    ast: real("ast"), // Aspartate aminotransferase
    alt: real("alt"), // Alanine aminotransferase

    // Other tests
    typeAndScreen: varchar("type_and_screen", { length: 255 }),
    covidTest: covidTestEnum("covid_test"),
    urinalysis: text("urinalysis"),

    // File uploads
    fileUploadUrls: text("file_upload_urls").array(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index("visits_patient_id_idx").on(table.patientId),
    visitDateIdx: index("visits_visit_date_idx").on(table.visitDate),
  }),
);

// Types for TypeScript
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
