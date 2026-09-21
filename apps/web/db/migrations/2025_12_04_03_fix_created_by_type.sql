-- Force created_by to be uuid by dropping and re-adding if type is not uuid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'med_evac_patients' AND column_name = 'created_by' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE "med_evac_patients" DROP COLUMN "created_by";
    ALTER TABLE "med_evac_patients" ADD COLUMN IF NOT EXISTS "created_by" uuid;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;
