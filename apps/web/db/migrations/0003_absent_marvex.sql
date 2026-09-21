DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'specialty_no_doctors';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "has_specialty_without_doctors" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_notifications" DROP COLUMN "methods";--> statement-breakpoint
ALTER TABLE "user_notifications" DROP COLUMN "email_address";