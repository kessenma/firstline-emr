-- Migration: Change patient hospital from enum to varchar for dynamic mission-based values
-- Also adds defaultIntakeHospital to missions table

-- Step 1: Change patient hospital column from enum to varchar
ALTER TABLE "patients" ALTER COLUMN "hospital" TYPE varchar(255) USING "hospital"::text;

-- Step 2: Set "Not Selected" values to NULL (no longer a valid value)
UPDATE "patients" SET "hospital" = NULL WHERE "hospital" = 'Not Selected';

-- Step 3: Drop the hospital enum type
DROP TYPE IF EXISTS "hospital";

-- Step 4: Add defaultIntakeHospital to missions
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "default_intake_hospital" varchar(255);
