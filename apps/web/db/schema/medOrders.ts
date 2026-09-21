// db/schema/medOrders.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  json,
  index,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { users } from "./users";

// Medication type
export type Medication = {
  _id: string;
  diagnosis: string;
  medication: string;
  dosage: string;
  frequency: string;
  quantity: string;
};

// Med Orders table
export const medOrders = pgTable(
  "med_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    oid: varchar("oid", { length: 255 }), // Order ID
    doctorSpecialty: varchar("doctor_specialty", { length: 255 }).notNull(),
    prescribingDr: varchar("prescribing_dr", { length: 255 }).notNull(),
    drEmail: varchar("dr_email", { length: 255 }).notNull(),
    drId: uuid("dr_id")
      .notNull()
      .references(() => users.id),
    orderDate: timestamp("order_date", { withTimezone: true }).defaultNow().notNull(),

    // Patient information
    patientName: varchar("patient_name", { length: 255 }).notNull(),
    patientPhone: varchar("patient_phone", { length: 50 }).notNull(),
    patientCity: varchar("patient_city", { length: 255 }).notNull(),
    patientCountry: varchar("patient_country", { length: 255 }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Validation status
    validated: boolean("validated").default(false).notNull(),

    // Medications array stored as JSON
    medications: json("medications").$type<Medication[]>().notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index("med_orders_patient_id_idx").on(table.patientId),
    drIdIdx: index("med_orders_dr_id_idx").on(table.drId),
    validatedIdx: index("med_orders_validated_idx").on(table.validated),
    orderDateIdx: index("med_orders_order_date_idx").on(table.orderDate),
  }),
);

// Types for TypeScript
export type MedOrder = typeof medOrders.$inferSelect;
export type NewMedOrder = typeof medOrders.$inferInsert;
