-- Migration: Move patient drafts from patients table to dedicated patient_drafts table
-- This separates incomplete/in-progress records from published patients.

-- Step 1: Create patient_drafts table
CREATE TABLE IF NOT EXISTS patient_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone JSONB,
  email VARCHAR(255),
  dob TIMESTAMPTZ,
  gender VARCHAR(50),
  country VARCHAR(255),
  city VARCHAR(255),
  language VARCHAR(100),
  chief_complaint TEXT,
  allergies TEXT,
  current_meds TEXT,
  specialties TEXT[],
  hospital VARCHAR(255),
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patient_drafts_created_by_id_idx ON patient_drafts (created_by_id);
CREATE INDEX IF NOT EXISTS patient_drafts_updated_at_idx ON patient_drafts (updated_at);

-- Step 2: Migrate existing drafts from patients to patient_drafts
INSERT INTO patient_drafts (
  id, first_name, last_name, phone, email, dob, gender,
  country, city, language, chief_complaint, allergies, current_meds,
  specialties, hospital, mission_id, created_by_id, created_at, updated_at
)
SELECT
  id, first_name, last_name, phone, email, dob, gender::varchar,
  country, city, language, chief_complaint, allergies, current_meds,
  specialties, hospital, mission_id,
  COALESCE(created_by_id, '00000000-0000-0000-0000-000000000000'),
  created_at, updated_at
FROM patients
WHERE draft = true;

-- Step 3: Delete migrated drafts from patients table
DELETE FROM patients WHERE draft = true;

-- Step 4: Remove draft column and associated index from patients table
DROP INDEX IF EXISTS patients_draft_idx;
ALTER TABLE patients DROP COLUMN IF EXISTS draft;
