-- Migration: Add editor metadata columns to notes and note_edits tables
-- Purpose:
--   1. notes table gets transient editor columns so PowerSync can sync editor identity to server
--   2. notes table gets skip_edit_record flag to control when server creates audit entries
--   3. note_edits table gets account type + care team role for richer audit trail

-- Notes table: transient editor metadata (synced via PowerSync so server knows WHO edited)
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "last_editor_id" uuid;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "last_editor_name" varchar(255);
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "last_editor_account_type" varchar(50);
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "last_editor_care_team_role" varchar(50);
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "skip_edit_record" boolean DEFAULT false;

-- Note edits table: richer editor metadata for audit display
ALTER TABLE "note_edits" ADD COLUMN IF NOT EXISTS "editor_account_type" varchar(50);
ALTER TABLE "note_edits" ADD COLUMN IF NOT EXISTS "editor_care_team_role" varchar(50);
