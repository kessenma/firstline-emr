-- Ensure created_by_name and created_by_email columns exist on med_evac_patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'med_evac_patients' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE "med_evac_patients" ADD COLUMN IF NOT EXISTS "created_by_name" varchar(255);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'med_evac_patients' AND column_name = 'created_by_email'
  ) THEN
    ALTER TABLE "med_evac_patients" ADD COLUMN IF NOT EXISTS "created_by_email" varchar(255);
  END IF;
END $$;
