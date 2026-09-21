ALTER TYPE "public"."feedback_category" ADD VALUE IF NOT EXISTS 'offline_access';--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "hospital" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "hospital" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "patient_chart_view" varchar(30) DEFAULT 'tabs';--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "hospitals" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "default_intake_hospital" varchar(255);--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "sync_diagnostics" json;--> statement-breakpoint
ALTER TABLE "missions" DROP COLUMN "mission_hospital";--> statement-breakpoint
DROP TYPE "public"."hospital";