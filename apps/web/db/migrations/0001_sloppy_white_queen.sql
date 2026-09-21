DO $$ BEGIN
 CREATE TYPE "public"."notification_method" AS ENUM('in-app', 'email');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."admin_approval_field" AS ENUM('doctorSpecialty', 'accountType');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'denied');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'profile_update_approved';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'profile_update_denied';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'profile_update_request';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'patient_update';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'system_notification';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."notification_type" ADD VALUE 'new_user_signup';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profile_update_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"field_name" "admin_approval_field" NOT NULL,
	"current_value" json,
	"requested_value" json NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_name" varchar(500) NOT NULL,
	"reviewed_by" uuid,
	"reviewed_by_email" varchar(255),
	"reviewed_by_name" varchar(500),
	"reviewed_at" timestamp,
	"review_notes" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "methods" text[] DEFAULT '{"in-app"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "email_address" varchar(255);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profile_update_requests" ADD CONSTRAINT "user_profile_update_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profile_update_requests" ADD CONSTRAINT "user_profile_update_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_update_requests_user_id_idx" ON "user_profile_update_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_update_requests_status_idx" ON "user_profile_update_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_update_requests_field_name_idx" ON "user_profile_update_requests" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_update_requests_user_id_status_idx" ON "user_profile_update_requests" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "use_infinite_scroll";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "save_last_page";