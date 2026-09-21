-- Convert med_evac_patients.created_by from json to uuid in dev
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'med_evac_patients'
      AND column_name = 'created_by'
      AND data_type = 'json'
  ) THEN
    ALTER TABLE "med_evac_patients" DROP COLUMN "created_by";
    ALTER TABLE "med_evac_patients" ADD COLUMN IF NOT EXISTS "created_by" uuid;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Ensure updated_by is uuid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'med_evac_patients'
      AND column_name = 'updated_by'
      AND data_type = 'json'
  ) THEN
    ALTER TABLE "med_evac_patients" DROP COLUMN "updated_by";
    ALTER TABLE "med_evac_patients" ADD COLUMN IF NOT EXISTS "updated_by" uuid;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;
