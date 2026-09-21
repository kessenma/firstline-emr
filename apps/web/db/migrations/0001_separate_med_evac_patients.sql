-- Migration: Separate Med Evac Patients from Patients Table
-- Created: 2024
-- Description: This migration adds patient demographic fields directly to med_evac_patients
--              table, removing the dependency on the patients table for med evac records.

-- Step 1: Create new gender enum for med evac patients
DO $$ BEGIN
  CREATE TYPE med_evac_gender AS ENUM ('Male', 'Female');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to med_evac_patients table
ALTER TABLE med_evac_patients
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dob TIMESTAMP,
  ADD COLUMN IF NOT EXISTS gender med_evac_gender,
  ADD COLUMN IF NOT EXISTS phone JSONB,
  ADD COLUMN IF NOT EXISTS country VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS language VARCHAR(100),
  ADD COLUMN IF NOT EXISTS chief_complaint TEXT;

-- Step 3: Migrate existing data from patients table to med_evac_patients
UPDATE med_evac_patients mep
SET
  first_name = p.first_name,
  last_name = p.last_name,
  dob = p.dob,
  gender = CASE
    WHEN p.gender = 'Male' THEN 'Male'::med_evac_gender
    WHEN p.gender = 'Female' THEN 'Female'::med_evac_gender
    ELSE NULL
  END,
  phone = p.phone,
  country = p.country,
  city = p.city,
  language = p.language,
  chief_complaint = p.chief_complaint
FROM patients p
WHERE mep.patient_id = p.id
  AND mep.first_name IS NULL; -- Only update records that haven't been migrated yet

-- Step 4: Make first_name and last_name NOT NULL after data migration
ALTER TABLE med_evac_patients
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- Step 5: Create indexes on new columns for better query performance
CREATE INDEX IF NOT EXISTS med_evac_patients_first_name_idx ON med_evac_patients(first_name);
CREATE INDEX IF NOT EXISTS med_evac_patients_last_name_idx ON med_evac_patients(last_name);

-- Step 6: Drop the old patient_id foreign key constraint
ALTER TABLE med_evac_patients
  DROP CONSTRAINT IF EXISTS med_evac_patients_patient_id_patients_id_fk;

-- Step 7: Drop the patient_id unique constraint
ALTER TABLE med_evac_patients
  DROP CONSTRAINT IF EXISTS med_evac_patients_patient_id_unique;

-- Step 8: Drop the patient_id index
DROP INDEX IF EXISTS med_evac_patients_patient_id_idx;

-- Step 9: Rename patient_id column to old_patient_id for historical reference (optional - can be removed later)
-- This preserves the link to the old patient record for reference purposes
ALTER TABLE med_evac_patients
  RENAME COLUMN patient_id TO old_patient_id;

-- Step 10: Add comment to old_patient_id column
COMMENT ON COLUMN med_evac_patients.old_patient_id IS 'Legacy reference to patients table - kept for historical data only. New records will have this as NULL.';

-- Step 11: Update audit log to add migration action
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'migrated'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'migrated';
  END IF;
END $$;

-- Step 12: Create audit log entries for migrated records
INSERT INTO med_evac_audit_log (
  med_evac_patient_id,
  action,
  action_description,
  user_name,
  created_at
)
SELECT
  id,
  'migrated'::audit_action,
  'Migrated patient demographic data from patients table to med_evac_patients table',
  'System Migration',
  NOW()
FROM med_evac_patients
WHERE old_patient_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM med_evac_audit_log
    WHERE med_evac_patient_id = med_evac_patients.id
    AND action = 'migrated'::audit_action
  );

-- Migration complete!
--
-- Summary of changes:
-- 1. Added patient demographic fields to med_evac_patients table
-- 2. Migrated existing data from patients to med_evac_patients
-- 3. Removed foreign key dependency on patients table
-- 4. Kept old_patient_id for historical reference
-- 5. Created indexes for new columns
-- 6. Added audit log entries for migration
--
-- IMPORTANT: After verifying the migration is successful, you may want to:
-- - Review any queries that join med_evac_patients with patients table
-- - Update application code to work with new schema
-- - Consider dropping old_patient_id column after verification period
-- - Optionally clean up orphaned patient records that only exist for med evac
