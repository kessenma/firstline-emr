// db/schema/patients.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  integer,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { missions } from "./missions";
import { videoCallSessions } from "./videoCallSessions";
import type { CareTeamMemberJSON } from "@fajr/shared/care-team";
import type { RxLinkLockState, RxCancellerRole } from "@fajr/shared/medications";

// Enums
export const patientGenderEnum = pgEnum("patient_gender", ["Male", "Female"]);
export const priorityEnum = pgEnum("priority", [
  "Not Selected",
  "Routine",
  "Moderate",
  "Urgent",
  "Emergency",
]);
export const statusEnum = pgEnum("status", [
  "Pre-Op / Not Cleared",
  "Pre-Op / Cleared",
  "Peri-Op / In Surgery",
  "Post-Op / In-Patient",
  "Post-Op / Discharged",
]);
export const baselineAmbuEnum = pgEnum("baseline_ambu", [
  "Not Selected",
  "Independent",
  "Boot",
  "Crutches",
  "Walker",
  "Non-Ambulatory",
]);

// Patients table
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),

    // Contact information
    phone: json("phone").$type<{
      countryCode: string;
      phoneNumber: string;
    }>(),
    email: varchar("email", { length: 255 }),
    telegramChatId: varchar("telegram_chat_id", { length: 255 }),
    telegramAccessHash: varchar("telegram_access_hash", { length: 255 }),

    // Personal details
    bmi: varchar("bmi", { length: 50 }),
    dob: timestamp("dob", { withTimezone: true }),
    gender: patientGenderEnum("gender"),
    country: varchar("country", { length: 255 }),
    city: varchar("city", { length: 255 }),
    language: varchar("language", { length: 100 }),
    occupation: varchar("occupation", { length: 255 }),

    // Medical information
    chiefComplaint: text("chief_complaint"),
    diagnosis: text("diagnosis"),
    diagnosisCat: varchar("diagnosis_cat", { length: 255 }),
    icd10: varchar("icd10", { length: 255 }),

    // Hospital and triage
    hospital: varchar("hospital", { length: 255 }),
    priority: priorityEnum("priority").default("Not Selected"),
    specialties: text("specialties").array(),
    status: statusEnum("status").default("Pre-Op / Not Cleared"),
    baselineAmbu: baselineAmbuEnum("baseline_ambu"),

    // Medical history
    pmhx: text("pmhx"), // Past medical history
    pshx: text("pshx"), // Past surgical history
    famhx: text("famhx"), // Family history
    allergies: text("allergies"),
    currentMeds: text("current_meds"),
    prevMeds: text("prev_meds"),

    // Social history
    smokeCount: varchar("smoke_count", { length: 100 }),
    drinkCount: varchar("drink_count", { length: 100 }),
    otherDrugs: text("other_drugs"),

    // Care coordination
    coordinatorId: uuid("coordinator_id").references(() => users.id),
    triagedBy: json("triaged_by").$type<{
      firstName?: string;
      lastName?: string;
      email?: string;
    }>(),
    careTeam: json("care_team").$type<CareTeamMemberJSON[]>().default([]),

    // Patient relationship
    isPatient: boolean("is_patient"),
    patientRelation: varchar("patient_relation", { length: 255 }),
    genderPreference: varchar("gender_preference", { length: 50 }),
    previouslyRegistered: varchar("previously_registered", { length: 50 }),

    // Scheduling
    scheduledVidChat: timestamp("scheduled_vid_chat", { withTimezone: true }),
    surgeryDate: timestamp("surgery_date", { withTimezone: true }),

    // Mission
    missionId: uuid("mission_id").references(() => missions.id, {
      onDelete: "set null",
    }),

    // Notes and status
    dashboardNotes: text("dashboard_notes"),
    hasSubmittedInfo: boolean("has_submitted_info").default(false),
    hasSpecialtyWithoutDoctors: boolean(
      "has_specialty_without_doctors",
    ).default(false),

    // Audit
    createdById: uuid("created_by_id").references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("patients_email_idx").on(table.email),
    statusIdx: index("patients_status_idx").on(table.status),
    coordinatorIdx: index("patients_coordinator_id_idx").on(
      table.coordinatorId,
    ),
    telegramIdx: index("patients_telegram_chat_id_idx").on(
      table.telegramChatId,
    ),

    missionIdIdx: index("patients_mission_id_idx").on(table.missionId),

    // Composite indexes for optimized dashboard queries
    statusCoordinatorIdx: index("patients_status_coordinator_idx").on(
      table.status,
      table.coordinatorId,
    ),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    statusCreatedAtIdx: index("patients_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    createdByIdIdx: index("patients_created_by_id_idx").on(table.createdById),
  }),
);

// Patient Media table (photos, PDFs, and other media)
export const patientMedia = pgTable(
  "patient_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    contentType: varchar("content_type", { length: 100 }),

    // Provenance. Null on rows predating this column, which are all manual
    // uploads — a backfill would only be guessing, and the UI treats null and
    // "upload" the same way.
    source: varchar("source", { length: 32 }),

    // Set when `source` is "video_call": which consult produced this image.
    //
    // videoCallSessions.ts imports this file, so this reference closes an
    // import cycle. It resolves because both sides express their foreign keys
    // as `() =>` thunks, which drizzle only evaluates after every module has
    // finished loading. Keep it that way — a direct table reference here would
    // hit a TDZ error at import time.
    videoCallSessionId: uuid("video_call_session_id").references(
      () => videoCallSessions.id,
      { onDelete: "set null" },
    ),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index("patient_media_patient_id_idx").on(table.patientId),
    videoCallSessionIdIdx: index("patient_media_video_call_session_id_idx").on(
      table.videoCallSessionId,
    ),
  }),
);

/** Values stored in `patientMedia.source`. */
export const PATIENT_MEDIA_SOURCE = {
  UPLOAD: "upload",
  VIDEO_CALL: "video_call",
} as const;

export type PatientMediaSource =
  (typeof PATIENT_MEDIA_SOURCE)[keyof typeof PATIENT_MEDIA_SOURCE];

// RX Orders table (embedded in Patient in MongoDB)
export const rxOrderStatusEnum = pgEnum("rx_order_status", [
  "not reviewed",
  "partially filled",
  "declined",
  "completed",
]);

export const rxOrders = pgTable(
  "rx_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    rxOrderId: varchar("rx_order_id", { length: 255 }).notNull(),
    doctorSpecialty: varchar("doctor_specialty", { length: 255 }),
    prescribingDr: varchar("prescribing_dr", { length: 255 }).notNull(),
    drEmail: varchar("dr_email", { length: 255 }).notNull(),
    drId: varchar("dr_id", { length: 255 }).notNull(),
    prescribedDate: timestamp("prescribed_date", { withTimezone: true }).notNull(),
    validTill: timestamp("valid_till", { withTimezone: true }).notNull(),
    city: varchar("city", { length: 255 }).notNull(),
    prescriptions: json("prescriptions")
      .$type<
        Array<{
          diagnosis: string;
          medication: string;
          dosage: string;
          frequency: string;
        }>
      >()
      .notNull(),
    patientRxUrl: text("patient_rx_url"),
    pharmacyQrCode: text("pharmacy_qr_code"),
    pharmacyQrUrl: text("pharmacy_qr_url"),
    rxDispenserName: varchar("rx_dispenser_name", { length: 255 }),
    rxDispenserContact: varchar("rx_dispenser_contact", { length: 255 }),
    rxStatus: rxOrderStatusEnum("rx_status"),
    submitted: boolean("submitted").default(false),
    partialRxNotes: text("partial_rx_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // Both PATCH handlers set this on every write; without the column Drizzle
    // has no target for the key and the fulfilment update path breaks.
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    // Delivery + access state. Written only by the server, read by both charts.
    // The access code itself lives in `rxOrderAccess` below, which is
    // deliberately absent from the PowerSync sync rules.
    patientLinkSentAt: timestamp("patient_link_sent_at", { withTimezone: true }),
    patientLinkSentBy: uuid("patient_link_sent_by"),
    /**
     * First successful unlock. Stamped from the unlock POST only — messaging
     * apps fetch link previews, so stamping on GET reports prescriptions as
     * read that nobody opened.
     */
    patientLinkOpenedAt: timestamp("patient_link_opened_at", { withTimezone: true }),
    patientLinkOpenCount: integer("patient_link_open_count").default(0).notNull(),
    patientLinkFailedCount: integer("patient_link_failed_count").default(0).notNull(),
    patientLinkLastFailedAt: timestamp("patient_link_last_failed_at", {
      withTimezone: true,
    }),
    /** 'ok' | 'throttled' | 'locked' — a verdict, carrying no secret. */
    patientLinkLockState: text("patient_link_lock_state")
      .$type<RxLinkLockState>()
      .default("ok")
      .notNull(),
    pharmacyLinkOpenedAt: timestamp("pharmacy_link_opened_at", { withTimezone: true }),

    // Cancellation. Its own axis rather than an rxStatus value: a pharmacy that
    // partially filled a script which is then cancelled has told us the patient
    // already holds half the medication, and one enum cannot say both.
    /** Set once, never cleared — cancellation is terminal. */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByRole: text("cancelled_by_role").$type<RxCancellerRole>(),
    /** Null when the patient cancelled: patients have no users row. */
    cancelledByUserId: uuid("cancelled_by_user_id"),
    cancellationReason: text("cancellation_reason"),
    cancellationReasonCode: text("cancellation_reason_code"),
  },
  (table) => ({
    patientIdIdx: index("rx_orders_patient_id_idx").on(table.patientId),
    rxOrderIdIdx: index("rx_orders_rx_order_id_idx").on(table.rxOrderId),
  }),
);

/**
 * Access code guarding the patient-facing prescription link.
 *
 * Server-only by design: this table must never appear in
 * `apps/powersync-server/config/sync-rules.yaml`, or the hash that protects a
 * patient's record would be replicated to every device on the care team.
 *
 * The throttle here *is* the security. A 6-digit code is only 10^6
 * combinations, so `rx-access-policy.ts` applies exponential backoff against
 * these counters. They live in the row rather than in a process-local Map
 * because a Map resets on deploy and does not hold across replicas.
 */
export const rxOrderAccess = pgTable("rx_order_access", {
  rxOrderId: uuid("rx_order_id")
    .primaryKey()
    .references(() => rxOrders.id, { onDelete: "cascade" }),
  /** sha256(salt || code). The plaintext is never stored and never logged. */
  codeHash: text("code_hash").notNull(),
  codeSalt: text("code_salt").notNull(),
  consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
  lifetimeFailures: integer("lifetime_failures").default(0).notNull(),
  retryAfter: timestamp("retry_after", { withTimezone: true }),
  // Separate from the patient counters: a pharmacist mistyping a date of birth
  // must never lock a patient out of their own prescription.
  pharmacyFailures: integer("pharmacy_failures").default(0).notNull(),
  pharmacyRetryAfter: timestamp("pharmacy_retry_after", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

/** Audit trail behind the "suspicious activity" badge. Server-only. */
export const rxOrderAccessAttempts = pgTable(
  "rx_order_access_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rxOrderId: uuid("rx_order_id")
      .notNull()
      .references(() => rxOrders.id, { onDelete: "cascade" }),
    gate: text("gate").$type<"patient" | "pharmacy">().notNull(),
    succeeded: boolean("succeeded").notNull(),
    /** Hashed, not raw — this judges a burst of failures, it is not a visitor log. */
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderTimeIdx: index("rx_order_access_attempts_order_time_idx").on(
      table.rxOrderId,
      table.createdAt,
    ),
    ipTimeIdx: index("rx_order_access_attempts_ip_time_idx").on(
      table.ipHash,
      table.createdAt,
    ),
  }),
);

// Types for TypeScript
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientMedia = typeof patientMedia.$inferSelect;
export type RxOrder = typeof rxOrders.$inferSelect;
export type NewRxOrder = typeof rxOrders.$inferInsert;
export type RxOrderAccess = typeof rxOrderAccess.$inferSelect;
export type NewRxOrderAccess = typeof rxOrderAccess.$inferInsert;
export type RxOrderAccessAttempt = typeof rxOrderAccessAttempts.$inferSelect;
export type NewRxOrderAccessAttempt = typeof rxOrderAccessAttempts.$inferInsert;
