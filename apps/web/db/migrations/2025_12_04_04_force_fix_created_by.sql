-- Force fix created_by column type to uuid in med_evac_patients
DO $$
BEGIN
  -- Drop the column if it exists (regardless of current type)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'med_evac_patients' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE "med_evac_patients" DROP COLUMN "created_by";
  END IF;

  -- Re-add with correct type
  ALTER TABLE "med_evac_patients" ADD COLUMN IF NOT EXISTS "created_by" uuid;
END $$;

