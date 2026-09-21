// db/schema/videoCallSessions.ts
//
// One row per video consult. This table is deliberately both the invite and
// the call-log entry — they are 1:1, so keeping them together lets the patient
// chart render call history with a plain `where patient_id = ...` and no join.
//
// The log columns (startedAt/endedAt/durationSeconds/status) are written by
// LiveKit webhooks, not by clients — see app/api/video-call/webhook/route.ts.
// A client-reported "call ended" never arrives if the app crashes or the
// battery dies, which would leave rows stuck in `active`.
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { users } from "./users";

// pending  — invite minted, nobody has joined yet
// active   — at least one participant is connected
// completed— ended, and the patient did join
// missed   — ended, but the patient never joined (clinically useful signal)
// expired  — invite lapsed without the call ever starting
export const videoCallStatusEnum = pgEnum("video_call_status", [
  "pending",
  "active",
  "completed",
  "missed",
  "expired",
]);

export const videoCallSessions = pgTable(
  "video_call_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // LiveKit room. Patient-scoped and unique per call, so two clinicians with
    // the same first name can never collide into one room.
    roomName: varchar("room_name", { length: 128 }).notNull(),

    startedById: uuid("started_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // --- Invite ---
    // 64 hex chars from randomBytes(32). This is the patient's only credential
    // for joining, so it is excluded from PowerSync — it must never land in a
    // client-side SQLite file.
    inviteToken: varchar("invite_token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),

    // --- Call log ---
    startedAt: timestamp("started_at", { withTimezone: true }),
    patientJoinedAt: timestamp("patient_joined_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    status: videoCallStatusEnum("status").default("pending").notNull(),
    endedReason: varchar("ended_reason", { length: 64 }),

    // Optional free text the clinician can add after hanging up. Deliberately
    // not a clinical note — auto-creating notes per call would pollute the
    // record.
    callNotes: text("call_notes"),

    // --- Photo consent ---
    // The patient is asked once per call before any still is captured, and the
    // answer is recorded here rather than held in browser state: it is the only
    // durable evidence that consent was given, and it lets a patient who
    // reloads their browser mid-call avoid being asked twice.
    //
    // Consent is deliberately per-session. A new call means a new row, which
    // means the patient is asked again — standing consent to photograph someone
    // is a much stronger claim than consent for one encounter.
    photoConsentAt: timestamp("photo_consent_at", { withTimezone: true }),
    photoConsentById: uuid("photo_consent_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    photoConsentDeniedAt: timestamp("photo_consent_denied_at", {
      withTimezone: true,
    }),

    // --- Transcription consent ---
    // Separate from photo consent on purpose: agreeing to be photographed and
    // agreeing to have the conversation written down are different asks, and
    // conflating them would mean neither was really consented to.
    //
    // Per-session, like photo consent. 'withdrawn' records a patient who
    // granted and then changed their mind mid-call; it is kept distinct from
    // 'declined' because what happens to already-captured audio differs.
    transcriptionConsent: varchar("transcription_consent", { length: 16 }),
    transcriptionConsentAt: timestamp("transcription_consent_at", {
      withTimezone: true,
    }),
    // The language the prompt was actually shown in. "They consented" means
    // little without knowing what they read.
    transcriptionConsentLocale: varchar("transcription_consent_locale", {
      length: 16,
    }),
    // Which wording they agreed to. Copy changes over time; this is what makes
    // the record defensible two years later.
    transcriptionConsentPromptVersion: varchar(
      "transcription_consent_prompt_version",
      { length: 32 },
    ),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    inviteTokenIdx: index("video_call_sessions_invite_token_idx").on(
      table.inviteToken,
    ),
    patientIdIdx: index("video_call_sessions_patient_id_idx").on(
      table.patientId,
    ),
    roomNameIdx: index("video_call_sessions_room_name_idx").on(table.roomName),
    statusIdx: index("video_call_sessions_status_idx").on(table.status),
    startedByIdIdx: index("video_call_sessions_started_by_id_idx").on(
      table.startedById,
    ),
  }),
);

// Types
export type VideoCallSession = typeof videoCallSessions.$inferSelect;
export type NewVideoCallSession = typeof videoCallSessions.$inferInsert;
