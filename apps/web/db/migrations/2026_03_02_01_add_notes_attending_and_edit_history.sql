-- Migration: Add attending physician columns to notes + note_edits audit table
-- Context: Connect notes system to care team — track attending physician (from isLead)
-- and full edit history for collaborative note editing

-- 1. Add attending physician columns to notes table (snapshots at creation time)
ALTER TABLE "notes" ADD COLUMN "attending_physician_id" uuid REFERENCES "users"("id");
ALTER TABLE "notes" ADD COLUMN "attending_physician_name" varchar(255);

CREATE INDEX IF NOT EXISTS "notes_attending_physician_id_idx"
  ON "notes" USING btree ("attending_physician_id");

-- 2. Create note_edit_type enum
DO $$ BEGIN
  CREATE TYPE "note_edit_type" AS ENUM ('created', 'updated', 'published');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create note_edits audit table
CREATE TABLE IF NOT EXISTS "note_edits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "note_id" uuid NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "editor_id" uuid REFERENCES "users"("id"),
  "editor_name" varchar(255),
  "edit_type" "note_edit_type" NOT NULL,
  "content_snapshot" json,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "note_edits_note_id_idx"
  ON "note_edits" USING btree ("note_id");
CREATE INDEX IF NOT EXISTS "note_edits_editor_id_idx"
  ON "note_edits" USING btree ("editor_id");
CREATE INDEX IF NOT EXISTS "note_edits_created_at_idx"
  ON "note_edits" USING btree ("created_at");
