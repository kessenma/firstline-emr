// db/schema/notes.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { users } from "./users";
import type { NoteContent as SharedNoteContent } from "@fajr/shared/patient";

// Enums
export const noteTypeEnum = pgEnum("note_type", [
  "procedure",
  "subjective",
  "blank",
  "triage",
  // Machine transcript of a video consult, produced on the clinician's device.
  // Its own type rather than a SOAP note: SOAP is the clinician's reasoning,
  // and folding an unreviewed transcript into it blurs who said what.
  "patient_call",
]);

// Notes table - base table for all note types
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(), // Patient email
    noteType: noteTypeEnum("note_type").notNull(),
    date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
    authorName: varchar("author_name", { length: 255 }),
    authorId: uuid("author_id").references(() => users.id),

    // Attending physician — snapshot of care team lead at time of note creation
    attendingPhysicianId: uuid("attending_physician_id").references(
      () => users.id,
    ),
    attendingPhysicianName: varchar("attending_physician_name", { length: 255 }),

    // Flexible content field - stores different structures based on noteType
    content: json("content").$type<
      | {
          // Procedure note
          attendingPhysician: string;
          procedureName: string;
          diagnosis: string;
          cptCodes?: Array<{
            code: string;
            description: string;
          }>;
          icd10Codes?: Array<{
            code: string;
            description: string;
          }>;
          notes: string;
          plan: string;
        }
      | {
          // Subjective note (SOAP format)
          subjective: string;
          objective: string;
          assessment: string;
          plan: string;
          icd10Codes?: Array<{
            code: string;
            description: string;
          }>;
          cptCodes?: Array<{
            code: string;
            description: string;
          }>;
        }
      | {
          // Blank note
          noteField: string;
        }
      | {
          // Triage note
          triageDetails: string;
        }
      | {
          // Patient call transcript. Written by the mobile client after an
          // on-device transcription run; see PatientCallNoteContent in
          // packages/shared/src/patient/note-types.ts, which is canonical.
          videoCallSessionId: string;
          callStartedAt: string;
          durationSeconds: number | null;
          mode: "live" | "post_call";
          doctorLocale: string;
          patientLocale: string;
          languageSupported: boolean;
          engine: string;
          droppedFrames: number;
          segments: Array<{
            speaker: "doctor" | "patient";
            text: string;
            startMs: number;
            endMs: number;
          }>;
          summary?: string;
        }
    >(),

    draft: boolean("draft").default(true).notNull(),

    // Transient editor metadata — set on each save so PowerSync syncs editor identity to server
    lastEditorId: uuid("last_editor_id"),
    lastEditorName: varchar("last_editor_name", { length: 255 }),
    lastEditorAccountType: varchar("last_editor_account_type", { length: 50 }),
    lastEditorCareTeamRole: varchar("last_editor_care_team_role", { length: 50 }),
    skipEditRecord: boolean("skip_edit_record").default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientIdIdx: index("notes_patient_id_idx").on(table.patientId),
    emailIdx: index("notes_email_idx").on(table.email),
    noteTypeIdx: index("notes_note_type_idx").on(table.noteType),
    authorIdIdx: index("notes_author_id_idx").on(table.authorId),
    draftIdx: index("notes_draft_idx").on(table.draft),
  }),
);

// Edit type enum for note audit trail
export const noteEditTypeEnum = pgEnum("note_edit_type", [
  "created",
  "updated",
  "published",
]);

// Note Edits — audit trail for every create/update/publish action
export const noteEdits = pgTable(
  "note_edits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id").references(() => users.id),
    editorName: varchar("editor_name", { length: 255 }),
    editorAccountType: varchar("editor_account_type", { length: 50 }),
    editorCareTeamRole: varchar("editor_care_team_role", { length: 50 }),
    editType: noteEditTypeEnum("edit_type").notNull(),
    // Typed rather than left as `unknown`: this is the same union as notes.content,
    // and mobile's NoteEditBase already declares it that way.
    contentSnapshot: json("content_snapshot").$type<SharedNoteContent>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    noteIdIdx: index("note_edits_note_id_idx").on(table.noteId),
    editorIdIdx: index("note_edits_editor_id_idx").on(table.editorId),
    createdAtIdx: index("note_edits_created_at_idx").on(table.createdAt),
  }),
);

// Types for TypeScript
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteEdit = typeof noteEdits.$inferSelect;
export type NewNoteEdit = typeof noteEdits.$inferInsert;

// Note content types are defined once in `@fajr/shared/patient` and shared with
// mobile. They were previously re-declared here by hand, which is drift waiting
// to happen — a field added to a note on mobile would not have reached web.
// Re-exported so the existing `@/db/schema/notes` import path keeps working.
export type {
  NoteType,
  NoteContent,
  ProcedureNoteContent,
  SubjectiveNoteContent,
  BlankNoteContent,
  TriageNoteContent,
  PatientCallNoteContent,
} from "@fajr/shared/patient";
