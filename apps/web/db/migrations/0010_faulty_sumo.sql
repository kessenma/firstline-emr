DROP TABLE IF EXISTS "med_evac_audit_log" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "med_evac_patients" CASCADE;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'account_type' AND e.enumlabel NOT IN ('Doctor', 'Triage')) THEN
    ALTER TABLE "users" ALTER COLUMN "account_type" SET DATA TYPE text;
    DROP TYPE "public"."account_type";
    CREATE TYPE "public"."account_type" AS ENUM('Doctor', 'Triage');
    ALTER TABLE "users" ALTER COLUMN "account_type" SET DATA TYPE "public"."account_type" USING "account_type"::"public"."account_type";
  END IF;
END $$;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."approval_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."audit_action";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."cogat_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."evacuation_urgency";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."gaza_referral_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."hospital_acceptance_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."hosting_family_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."ks_classification";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."med_evac_gender";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."mrsa_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."passport_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."treatment_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."visa_status";