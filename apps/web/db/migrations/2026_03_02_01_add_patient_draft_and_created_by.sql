-- Add draft and created_by_id columns to patients table
-- draft: boolean flag to mark incomplete patient records (auto-save drafts)
-- created_by_id: audit trail — tracks which user originally created the patient record

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);

-- Index for filtering drafts from patient lists
CREATE INDEX IF NOT EXISTS patients_draft_idx ON patients (draft);

-- Index for looking up drafts by creator
CREATE INDEX IF NOT EXISTS patients_created_by_id_idx ON patients (created_by_id);
