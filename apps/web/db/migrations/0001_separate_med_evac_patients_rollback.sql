-- Rollback Migration: Restore Med Evac Patients dependency on Patients Table
-- Created: 2024
-- Description: This migration rolls back the separation of med_evac_patients from patients table.
--              Use this ONLY if you need to revert the changes from 0001_separate_med_evac_patients.sql

-- WARNING: This rollback assumes:
-- 1. No new med evac patients have been created since the forward migration
-- 2. The old_patient_id column still exists with valid references
-- 3. The patients table records still exist

-- Step 1: Rename old_patient_id back to patient_id
ALTER TABLE med_evac_patients
  RENAME COLUMN old_patient_id TO patient_id;

-- Step 2: Recreate the foreign key constraint
ALTER TABLE med_evac_patients
  ADD CONSTRAINT med_evac_patients_patient_id_patients_id_fk
  FOREIGN KEY (patient_id)
  REFERENCES patients(id)
  ON DELETE CASCADE;

-- Step 3: Recreate the unique constraint
ALTER TABLE med_evac_patients
  ADD CONSTRAINT med_evac_patients_patient_id_unique
  UNIQUE (patient_id);

-- Step 4: Recreate the patient_id index
CREATE INDEX med_evac_patients_patient_id_idx ON med_evac_patients(patient_id);

-- Step 5: Drop the new indexes
DROP INDEX IF EXISTS med_evac_patients_first_name_idx;
DROP INDEX IF EXISTS med_evac_patients_last_name_idx;

-- Step 6: Remove NOT NULL constraints from new columns
ALTER TABLE med_evac_patients
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL;

-- Step 7: Drop the new columns
ALTER TABLE med_evac_patients
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS language,
  DROP COLUMN IF EXISTS chief_complaint;

-- Step 8: Drop the med_evac_gender enum type
DROP TYPE IF EXISTS med_evac_gender;

-- Step 9: Remove migration audit log entries
DELETE FROM med_evac_audit_log
WHERE action = 'migrated'::audit_action
  AND action_description LIKE '%Migrated patient demographic data%';

-- Rollback complete!
--
-- Summary of rollback:
-- 1. Restored patient_id column and foreign key
-- 2. Removed demographic columns from med_evac_patients
-- 3. Removed custom gender enum
-- 4. Removed migration audit entries
--
-- IMPORTANT: After rollback, ensure:
-- - All med evac patients have valid patient_id references
-- - Application code is reverted to use old schema
-- - Any new med evac records created after migration are handled appropriately
