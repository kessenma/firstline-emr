ALTER TABLE "user_settings" ADD COLUMN "notify_internal_messages" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "notify_patient_messages" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "notify_patient_actions" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_start" varchar(10);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_end" varchar(10);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_timezone" varchar(100);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "category" varchar(50);