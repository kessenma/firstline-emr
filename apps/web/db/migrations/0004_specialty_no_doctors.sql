-- Add specialty_no_doctors to notification_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'specialty_no_doctors'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'notification_type'
        )
    ) THEN
        ALTER TYPE "public"."notification_type" ADD VALUE 'specialty_no_doctors';
    END IF;
END $$;

-- Add has_specialty_without_doctors column to patients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patients'
        AND column_name = 'has_specialty_without_doctors'
    ) THEN
        ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "has_specialty_without_doctors" boolean DEFAULT false;
    END IF;
END $$;
