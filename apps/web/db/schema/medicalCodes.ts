// db/schema/medicalCodes.ts
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

// ICD-10 Codes table
export const icd10Codes = pgTable(
  'icd10_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 10 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('icd10_codes_code_idx').on(table.code),
    descriptionIdx: index('icd10_codes_description_idx').on(table.description),
  })
);

// CPT Codes table
export const cptCodes = pgTable(
  'cpt_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 10 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('cpt_codes_code_idx').on(table.code),
    descriptionIdx: index('cpt_codes_description_idx').on(table.description),
  })
);

// Types for TypeScript
export type ICD10Code = typeof icd10Codes.$inferSelect;
export type NewICD10Code = typeof icd10Codes.$inferInsert;
export type CPTCode = typeof cptCodes.$inferSelect;
export type NewCPTCode = typeof cptCodes.$inferInsert;
