-- Migrate missions.mission_hospital (varchar) to missions.hospitals (json array)
-- This allows multiple hospitals per mission instead of just one

-- Add the new hospitals JSON column
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "hospitals" json DEFAULT '[]'::json;

-- Migrate existing data: wrap the single hospital string in a JSON array
UPDATE "missions"
SET "hospitals" = json_build_array("mission_hospital")
WHERE "mission_hospital" IS NOT NULL AND "mission_hospital" != '';

-- Drop the old column
ALTER TABLE "missions" DROP COLUMN IF EXISTS "mission_hospital";
