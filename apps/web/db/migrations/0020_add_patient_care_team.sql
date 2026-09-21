-- Migration: Add Patient Care Team and Care Team Conflicts tables
-- Purpose: Many-to-many patient-user care team with offline conflict detection
-- Supports medical missions where multiple doctors collaborate on patients

-- Create care_team_role enum
DO $$ BEGIN
  CREATE TYPE "care_team_role" AS ENUM (
    'surgeon', 'assistant', 'consulting', 'triage', 'coordinator'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create conflict_status enum
DO $$ BEGIN
  CREATE TYPE "conflict_status" AS ENUM ('unresolved', 'resolved');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create patient_care_team table
CREATE TABLE IF NOT EXISTS "patient_care_team" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "care_team_role" NOT NULL,
  "is_lead" boolean DEFAULT false NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  "assigned_by" uuid REFERENCES "users"("id"),
  "removed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create care_team_conflicts table
CREATE TABLE IF NOT EXISTS "care_team_conflicts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "conflicting_user_ids" text[] NOT NULL,
  "status" "conflict_status" DEFAULT 'unresolved' NOT NULL,
  "resolved_by" uuid REFERENCES "users"("id"),
  "resolved_at" timestamp,
  "resolution_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for patient_care_team
CREATE INDEX IF NOT EXISTS "pct_patient_id_idx" ON "patient_care_team" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "pct_user_id_idx" ON "patient_care_team" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "pct_is_lead_idx" ON "patient_care_team" USING btree ("patient_id", "is_lead");
CREATE INDEX IF NOT EXISTS "pct_removed_at_idx" ON "patient_care_team" USING btree ("removed_at");

-- Partial unique index: only one active assignment per patient-user pair
-- Allows historical records (removed_at IS NOT NULL) while preventing active duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "pct_patient_user_active_idx"
  ON "patient_care_team" ("patient_id", "user_id")
  WHERE "removed_at" IS NULL;

-- Indexes for care_team_conflicts
CREATE INDEX IF NOT EXISTS "ctc_patient_id_idx" ON "care_team_conflicts" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "ctc_status_idx" ON "care_team_conflicts" USING btree ("status");
CREATE INDEX IF NOT EXISTS "ctc_created_at_idx" ON "care_team_conflicts" USING btree ("created_at");

-- Add care_team_conflict to notification_type enum
DO $$ BEGIN
  ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'care_team_conflict';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add new tables to the PowerSync publication for logical replication
-- The publication name matches POWERSYNC_PUBLICATION env var (default: powersync_publication)
DO $$ BEGIN
  ALTER PUBLICATION powersync_publication ADD TABLE patient_care_team, care_team_conflicts;
EXCEPTION WHEN undefined_object THEN
  -- Publication doesn't exist yet (e.g., local dev without PowerSync)
  RAISE NOTICE 'Publication powersync_publication not found, skipping';
WHEN duplicate_object THEN
  -- Tables already in publication
  NULL;
WHEN SQLSTATE '55000' THEN
  -- Publication is FOR ALL TABLES, individual adds not needed
  NULL;
END $$;

-- Backfill: Migrate existing patients.doctor JSON into patient_care_team
-- Only runs if the legacy doctor column still exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'doctor'
  ) THEN
    INSERT INTO "patient_care_team" ("patient_id", "user_id", "role", "is_lead", "assigned_at")
    SELECT
      p."id",
      u."id",
      'surgeon'::"care_team_role",
      true,
      COALESCE(p."updated_at", p."created_at")
    FROM "patients" p
    JOIN "users" u ON p."doctor"->>'email' = u."email"
    WHERE p."doctor" IS NOT NULL
      AND p."doctor"->>'email' IS NOT NULL
      AND p."doctor"->>'email' != ''
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
