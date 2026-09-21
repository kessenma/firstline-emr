-- Status enum already migrated; make idempotent
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'status' AND e.enumlabel = 'Pre-Op / Not Cleared') THEN
    ALTER TABLE "patients" ALTER COLUMN "status" SET DATA TYPE text;
    ALTER TABLE "patients" ALTER COLUMN "status" SET DEFAULT 'Pre-Op / Not Cleared'::text;
    UPDATE "patients" SET "status" = 'Pre-Op / Not Cleared' WHERE "status" IS NOT NULL;
    DROP TYPE "public"."status";
    CREATE TYPE "public"."status" AS ENUM('Pre-Op / Not Cleared', 'Pre-Op / Cleared', 'Peri-Op / In Surgery', 'Post-Op / In-Patient', 'Post-Op / Discharged');
    ALTER TABLE "patients" ALTER COLUMN "status" SET DEFAULT 'Pre-Op / Not Cleared'::"public"."status";
    ALTER TABLE "patients" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";
  END IF;
END $$;